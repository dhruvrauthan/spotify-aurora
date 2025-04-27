const cors = require('cors');
const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const { Vibrant } = require('node-vibrant/node');
const ColorThief = require('colorthief');
const { MaxPriorityQueue } = require('@datastructures-js/priority-queue'); // Install via npm
const _ = require('lodash'); // For counting occurrences
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./artist_genres.db');

const fs = require('fs');
const csv = require('csv-parser');

let genreColorMapping = {}; // Store genre-color pairs

// Load genre colors from CSV file
function loadGenreColors() {
    return new Promise((resolve, reject) => {
        const results = {};
        fs.createReadStream('./mapping.csv') // Ensure the file is in the correct location
            .pipe(csv())
            .on('data', (row) => {
                const genre = row["Genre"].toLowerCase();
                const color = row["Color"];
                results[genre] = color;
            })
            .on('end', () => {
                genreColorMapping = results;
                console.log("Genre color mapping loaded successfully.");
                resolve();
            })
            .on('error', (error) => {
                console.error("Error reading CSV file:", error);
                reject(error);
            });
    });
}

const app = express();
app.use(cors());

db.run(`CREATE TABLE IF NOT EXISTS artist_genres (
    artist_id TEXT PRIMARY KEY,
    genres TEXT
)`);

var client_id = '89245943c2b9423aa7dd577af1512b04';
var client_secret = '6a7ed9a61fec4da789902253bc289f31';
var redirect_uri = 'http://localhost:8888/callback';
let access_token = null; // Store access token
var tracks;

app.get('/login', (req, res) => {
	const scope = 'playlist-read-private playlist-read-collaborative';
	const state = generateRandomString(16);
	const authQueryParams = querystring.stringify({
	  response_type: 'code',
	  client_id: client_id,
	  scope: scope,
	  redirect_uri: redirect_uri,
	  state: state,
	});
	res.redirect(`https://accounts.spotify.com/authorize?${authQueryParams}`);
});

app.get('/callback', async (req, res) => {
	const code = req.query.code || null;
	const authOptions = {
	  url: 'https://accounts.spotify.com/api/token',
	  data: querystring.stringify({
		code: code,
		redirect_uri: redirect_uri,
		grant_type: 'authorization_code',
	  }),
	  headers: {
		Authorization: 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
		'Content-Type': 'application/x-www-form-urlencoded',
	  },
	};
  
	try {
        const response = await axios.post(authOptions.url, authOptions.data, { headers: authOptions.headers });
        access_token = response.data.access_token; // Store access token
        // In your /callback route
		res.redirect(`http://localhost:3000/?loggedIn=true`);
    } catch (error) {
        res.send('Error retrieving access token');
    }
});

app.get('/playlists', async (req, res) => {
    // TODO add offset to playlists too
    if (!access_token) return res.status(401).json({ error: "Unauthorized" });

    try {
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        const userId = userResponse.data.id;

        const playlistsResponse = await axios.get(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        res.json(playlistsResponse.data.items);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching playlists' });
    }
});

app.get('/playlist-tracks/:id', async (req, res) => {
    if (!access_token) return res.status(401).json({ error: "Unauthorized" });

    const playlistId = req.params.id;
    let allTracks = [];
    let offset = 0;
    const limit = 50; // Max limit allowed by Spotify API
    let total = 1; // Placeholder to enter the loop

    try {
        while (offset < total) {
            const tracksResponse = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                headers: { Authorization: `Bearer ${access_token}` },
                params: { limit, offset }
            });

            const trackItems = tracksResponse.data.items;
            total = tracksResponse.data.total; // Update total number of tracks

            let trackData = trackItems.map(track => ({
                name: track.track.name,
                albumCover: track.track.album.images[0]?.url || "",
                artistId: track.track.artists[0]?.id || null,
            })).filter(track => track.artistId !== null); // Ensure valid artist IDs

            allTracks = allTracks.concat(trackData);
            offset += limit; // Shift offset for next request
        }

        // Extract colors
        const colors = await extractDominantColors(allTracks);

        // Get genres for all artists
        const genreCounts = await getGenres(allTracks);

        res.json({ colors, genreCounts });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching tracks' });
    }
});

const MAX_GENRES = 10; // Maximum number of top genres to keep
const MAX_RETRIES = 3; // Maximum number of retries per request
const RETRY_DELAY = 30000; // 30 seconds delay

const artistGenreCache = {}; // Local cache for artist ID -> genres mapping

////////////////////////////////////
// Use SQL db to store across sessions
////////////////////////////////////

// async function fetchArtistGenres(artistId, attempt = 1) {
//     return new Promise((resolve, reject) => {
//         db.get("SELECT genres FROM artist_genres WHERE artist_id = ?", [artistId], async (err, row) => {
//             if (err) {
//                 console.error("DB Error:", err);
//                 return reject(err);
//             }

//             if (row) {
//                 return resolve(JSON.parse(row.genres)); // Return cached genres
//             } 

//             // Fetch from API if not in DB
//             try {
//                 const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
//                     headers: { Authorization: `Bearer ${access_token}` },
//                 });

//                 const genres = artistResponse.data.genres;
// 				console.log(artistResponse.data.name + ": " + genres);

//                 // Store in DB
//                 db.run("INSERT INTO artist_genres (artist_id, genres) VALUES (?, ?)", [artistId, JSON.stringify(genres)]);
                
//                 resolve(genres);
//             } catch (error) {
//                 console.log(`Error fetching genre for artist ${artistId}, attempt ${attempt}:`, error.message);

//                 if (attempt < MAX_RETRIES) {
//                     console.log(`Retrying in 30 seconds...`);
//                     await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
//                     return resolve(fetchArtistGenres(artistId, attempt + 1)); 
//                 } else {
//                     console.log(`Failed after ${MAX_RETRIES} attempts. Skipping artist ${artistId}.`);
//                     resolve([]); 
//                 }
//             }
//         });
//     });
// }

async function fetchArtistGenres(artistId, attempt = 1) {
    // Check cache first
    if (artistGenreCache[artistId]) {
        return artistGenreCache[artistId]; // Return cached genres
    }

    try {
        const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const genres = artistResponse.data.genres;
		console.log(artistResponse.data.name + ": " + genres);
        artistGenreCache[artistId] = genres; // Store in cache
        return genres;
    } catch (error) {
        console.log(`Error fetching genre for artist ${artistId}, attempt ${attempt}:`, error.message);

        if (attempt < MAX_RETRIES) {
            console.log(`Retrying in 30 seconds...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY)); // Wait 30 seconds
            return fetchArtistGenres(artistId, attempt + 1); // Recursive retry
        } else {
            console.log(`Failed after ${MAX_RETRIES} attempts. Skipping artist ${artistId}.`);
            return []; // Return empty array to avoid breaking genre list
        }
    }
}

async function getGenres(tracks) {
    let genresList = [];

    for (const track of tracks) {
        if (track.artistId) {
            const genres = await fetchArtistGenres(track.artistId);
            genresList.push(...genres);
        }
    }

    // Count genre occurrences
    const genreCounts = _.countBy(genresList);

	// Sort genres by occurrence and keep the top 10
    const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1]) // Sort descending by count
        .slice(0, 10) // Keep only top 10
        .map(([genre, count]) => ({
            genre,
            count,
            color: genreColorMapping[genre.toLowerCase()] || null // Can default to another color if required
        }))
		.filter(g => g.color !== null);;

    return topGenres;

    // // Initialize priority queue
    // const genreQueue = new MaxPriorityQueue({ priority: (entry) => entry.count });

    // // Insert elements dynamically, keeping only the top MAX_GENRES
    // Object.entries(genreCounts).forEach(([genre, count]) => {
    //     if (genreQueue.size() < MAX_GENRES) {
    //         // If queue is not full, just enqueue
    //         genreQueue.enqueue({ genre, count }, count);
    //     } else {
    //         // If queue is full, check if new genre is more frequent than the lowest in queue
    //         const minGenre = genreQueue.front(); // Least frequent genre
    //         if (minGenre.priority < count) {
    //             genreQueue.dequeue(); // Remove least frequent genre
    //             genreQueue.enqueue({ genre, count }, count); // Insert new one
    //         }
    //     }
    // });

    // // Convert heap to sorted array
    // const sortedGenres = [];
    // while (!genreQueue.isEmpty()) {
    //     sortedGenres.push(genreQueue.dequeue());
    // }

    // return sortedGenres.reverse(); // Reverse to show highest first
}

function rgbToHex(rgbArray) {
    return `#${rgbArray.map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

async function extractDominantColors(tracks) {
    let colors = {};
    for (let track of tracks) {
        if (track.albumCover) {
            try {
				// const palette = await Vibrant.from(track.albumCover).getPalette();
                // colors[track.name] = palette.Vibrant.hex;

				// console.log(palette.Vibrant.hex);

				const response = await axios.get(track.albumCover, { responseType: 'arraybuffer' });
				const buffer = Buffer.from(response.data); // Convert to buffer
				
				// Extract the dominant color
				const dominantColor = await ColorThief.getColor(buffer);
				const hexColor = rgbToHex(dominantColor); 
				colors[track.name] = hexColor;
            } catch (error) {
                colors[track.name] = "#000000"; // Default to black if extraction fails
				console.log("extraction failed error:", error);
            }
        }
    }
    return colors;
}

function generateRandomString(length) {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < length; i++) {
	  text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

loadGenreColors().then(() => {
    app.listen(8888, () => {
        console.log("Server started on port 8888");
    });
}).catch(err => {
    console.error("Failed to load genre colors. Server not started.", err);
});