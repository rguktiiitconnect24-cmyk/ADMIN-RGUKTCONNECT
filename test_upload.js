const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby9IM_x4Ash_92FLuZiYNNbVaYqMjaP1xH_trKChOZch5LmNHicC8ivPyhgBm-Nw9jDLg/exec";

async function testUpload() {
    try {
        const body = new URLSearchParams();
        body.append('filename', 'test.txt');
        body.append('mimeType', 'text/plain');
        body.append('data', Buffer.from('Hello world').toString('base64'));

        console.log("Sending URL Encoded...");
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: body
        });
        
        console.log("Status:", res.status);
        console.log("Response:", await res.text());
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testUpload();
