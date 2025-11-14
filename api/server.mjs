// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(cors(
// //       {
// //       origin: ['chrome-extension://*'],
// //       methods: ['GET']
// // }
// ));

// app.get('/api/animals', async(req, res) => {
//       try{
//             const page = req.query.page || 1;
//             const _PEXELS_API_KEY = process.env._PEXELS_API_KEY;

//             if(!_PEXELS_API_KEY){
//                   return res.status(500).json({error: 'API key not configured'});
//             }

//       const response = await fetch(
//             `https://api.pexels.com/v1/search?query=cute+animals&per_page=15&page=${page}`,
//             {
//                   headers: {
//                         Authorization: _PEXELS_API_KEY,
//                   },
//             }
//       );

//       if(!response.ok){
//             throw new Error('Pexels API request failed.');
//       }

//       const data = await response.json();
//       res.json(data);
// } catch(error) {
// console.error('Proxy error:', error);
// res.status(500).json({error: 'Failed to fetch images'});
// }
// }
// );

// app.get('/health', (req, res) => {
//       res.json({status: 'ok'});
// });

// app.listen(PORT, () => {
//       console.log(`Proxy server running on port ${PORT}`);
// })

import fetch from "node-fetch";

export default async function handler(req, res) {
  const { page = 1 } = req.query;
  const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=cute+animals&per_page=15&page=${page}`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: "Pexels API request failed" });
    }

    const data = await response.json();

    // 🐶 IMPORTANT: Format the response for the popup
    const formatted = data.photos.map((p) => ({
      id: p.id,
      url: p.src.original,     // popup expects "url"
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ error: "Failed to fetch from Pexels" });
  }
}

