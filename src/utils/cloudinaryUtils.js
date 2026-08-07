// Utility to generate Cloudinary signature for Signed Uploads
export const generateCloudinarySignature = async (publicId, timestamp, apiSecret) => {
    const strToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    
    // Use Web Crypto API to generate SHA-1 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(strToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    
    // Convert array buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};
