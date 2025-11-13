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
  const { q = "cute+animals", per_page = 15, page = 1 } = req.query;
  const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${q}&per_page=${per_page}&page=${page}`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch from Pexels" });
  }
}
