import * as gzip from "gzip-js"

// const statusList = [1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1];

export const convertToBase = (statusList) => {
  let byteArray = [];
  for (let i = 0; i < statusList.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) {
          if (statusList[i + j] === 1) {
              byte |= (1 << j);
          }
      }
      byteArray.push(byte);
  }

  const hexArray = byteArray.map(byte => `0x${byte.toString(16).padStart(2, '0')}`);
  const zipped = gzip.zip(hexArray)
  // console.log(Buffer.from(zipped))

  return Buffer.from(zipped).toString('base64')
}

export const statusListBaseToBitArray = (base64String) => {
  const decoded = Buffer.from(base64String, "base64")
  // console.log(decoded)
  const byteArray = gzip.unzip(decoded)
  // console.log(byteArray)
  const bitArray = [];
  
  for (const value of byteArray) {
    for (let i = 0; i <= 7; i++) {
      bitArray.push((value >> i) & 1);
    }
  }
  
  // console.log(bitArray)
  return bitArray;
}

export const getStatusCode = (list, index, bits) => {
  let i = 0
  for (let j = 0; j < index; j++) {
    i += bits
  }
  const bitString = list.slice(i, i + bits).reverse().join("")
  // console.log(bitString)
  return parseInt(bitString, 2)
}

/*
const statusListBase = convertToBase(statusList)
console.log(statusListBase)

const bitArray = statusListBaseToBitArray(statusListBase);
console.log(bitArray)

console.log(getStatusCode([
  1, 0, 0, 1, 1, 1,
  0, 1, 1, 1, 0, 0,
  0, 1, 0, 1
], 4, 1))
*/
