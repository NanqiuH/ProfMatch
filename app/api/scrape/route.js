import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

export async function POST(req) {
  try {
    const { url } = await req.json();

    // Fetch the HTML using Axios
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    // Extract the first review text
    const firstReview = $('div.Comments__StyledComments-dzzyvm-0.gRjWel').first().text().trim();

    const professorData = {
      name: $('meta[name="title"]').attr('content')?.split(' at ')[0] || 'Unknown',
      stars: $('div.liyUjw').text().trim(),
      subject: $('meta[name="description"]').attr('content')?.split('in the ')[1]?.split(' department')[0] || 'Unknown',
      review: [firstReview], // Store the first review in an array
    };

    // Validate that all necessary data was scraped
    if (!professorData.name || !professorData.stars || !professorData.subject) {
      throw new Error('Failed to scrape some of the professor data. Please check the selectors.');
    }

    // Connect to Pinecone
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    const index = pc.index('rag').namespace('ns1');

    // Convert the professorData to an embedding using OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: JSON.stringify(professorData),
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Ensure embedding is an array of numbers
    if (!Array.isArray(embedding)) {
      throw new Error('Failed to generate a valid embedding. Expected an array of numbers.');
    }

    // Insert the data into Pinecone (ensure vectors is an array)
    await index.upsert([
        {
          id: professorData.name, // Use the professor's name as the ID
          values: embedding,
          metadata: {
            ...professorData,
          },
        },
      ],
    );

    return NextResponse.json({ message: 'Success' });
  } catch (error) {
    console.error('Error occurred:', error);
    return NextResponse.json({ message: 'Error', error: error.stack }, { status: 500 });
  }
}
