import { createHash } from 'crypto';
import axios from 'axios';

function calculateHash(data) {
  const hash = createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

export async function createHashlink(url) {
  const response = await axios.get(url);
  const dataToHash = JSON.stringify(response.data);
  const objectHash = calculateHash(dataToHash);
  return `${url}?hash=${objectHash}`;
}

async function createHashlinkData({data, url}) {
  const dataToHash = JSON.stringify(data);
  const objectHash = calculateHash(dataToHash);
  return `${url}?hash=${objectHash}`;
}

export async function verifyObject(hashlink) {
  try {
    // Parse the hashlink URL to extract the hash query parameter
    const parsedUrl = new URL(hashlink);
    const receivedHash = parsedUrl.searchParams.get('hash');

    // Fetch data from the endpoint
    const response = await axios.get(hashlink);
    const responseData = JSON.stringify(response.data);

    if (receivedHash === calculateHash(responseData)) {
      console.log('Object is valid.');
    } else {
      console.log('Object is tampered or corrupted.');
    }
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}