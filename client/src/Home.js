import React, { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";
import axios from "axios";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuroraScene from "./components/AuroraScene";

function hexToHue(hex) {
  // Remove the hash if present
  hex = hex.replace(/^#/, '');
  if (hex.length !== 6) {
    throw new Error('Only full hex colors are supported, e.g., #C6D826');
  }
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue;
  if (delta === 0) {
    hue = 0;
  } else if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else { // max === b
    hue = (r - g) / delta + 4;
  }
  hue = hue * 60; // Convert to degrees
  if (hue < 0) hue += 360;
  return hue / 360; // Normalize to [0, 1]
}

function App() {
  const [playlists, setPlaylists] = useState([]);
  const [trackColors, setTrackColors] = useState({});
  const [genres, setGenres] = useState([]);

  const [vertex, setVertex] = useState("");
  const [fragment, setFragment] = useState("");

  useEffect(() => {
    // fetch the vertex and fragment shaders from public folder 
    axios.get("/shader/vertexShader.glsl").then((res) => setVertex(res.data));
    // axios.get("/shader/fragmentShader.glsl").then((res) => setFragment(res.data));
    axios.get("/shader/auroraFragment.glsl").then((res) => setFragment(res.data));
  }, []);

  if (vertex == "" || fragment == "") {
    return(
      <div>
          <h1>Something's wrong!</h1>
      </div>
    )
  }

  const fetchPlaylists = async () => {
      try {
          const response = await axios.get("http://localhost:8888/playlists");
          setPlaylists(response.data);
      } catch (error) {
          console.error("Error fetching playlists:", error);
      }
  };

  const fetchPlaylistTracks = async (playlistId) => {
    try {
        const response = await axios.get(`http://localhost:8888/playlist-tracks/${playlistId}`);
        setTrackColors(response.data.colors);
        setGenres(response.data.genreCounts); // Store sorted genre list
    } catch (error) {
        console.error("Error fetching playlist tracks:", error);
    }
  };

  const handleLogin = () => {
      // Redirect to backend login route for Spotify authentication
      setTimeout(() => {
          window.location.href = "http://localhost:8888/login";
      }, 1000);
  };

  const topGenreHue =
    genres.length > 0
      ? hexToHue(
          genres.reduce((prev, curr) => (curr.count > prev.count ? curr : prev)).color
        )
      : 0.6;

  return (
      <div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <h1>Chromesthesia</h1>
            <button onClick={handleLogin} style={styles.button}>Login</button>
            <button onClick={fetchPlaylists} style={styles.button}>Get Playlists</button>
          </div>

        <Canvas
          camera={{ position: [0, 0, 5], fov: 75 }}
          style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: -1 }}
        >
          <AuroraScene vertex={vertex} fragment={fragment} phaseHue={topGenreHue} />
        </Canvas>

          {/* {genres.length > 0 && (
            <div>
              <MeshGradientBackground colors={genres.map(g => g.color)}/>
            </div>
          )}
          
          <Starfield starCount={20000} /> */}

          <div>
              <h3>Most Frequent Genres</h3>
              <ul style={styles.genreList}>
                  {genres.map(({ genre, count, color }, index) => (
                      <li key={index} style={{ ...styles.genreItem }}>
                          <span style={{ ...styles.colorDot, backgroundColor: color }}></span>
                          {genre} ({count} times)
                      </li>
                  ))}
              </ul>
          </div>
          
          {playlists.map((playlist) => (
              <div key={playlist.id}>
                  <p>{playlist.name}</p>
                  <button onClick={() => fetchPlaylistTracks(playlist.id)} style={styles.button}>Get Colors</button>
              </div>
          ))}

          <div>
              <h3>Track Colors</h3>
              {Object.entries(trackColors).map(([track, color]) => (
                  <div key={track} style={{ display: "flex", alignItems: "center", margin: "10px" }}>
                      <div style={{ width: "20px", height: "20px", backgroundColor: color, marginRight: "10px" }}></div>
                      <p>{track}</p>
                  </div>
              ))}
          </div>
      </div>
  );
}

const styles = {
    button: {
        padding: "10px 20px",
        fontSize: "16px",
        backgroundColor: "#1DB954",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        margin: "10px",
    },
    playlistContainer: {
        marginTop: "20px",
    },
};

export default App;