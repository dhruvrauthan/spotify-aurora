import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { Canvas } from "@react-three/fiber";
import AuroraScene from "./components/AuroraScene";
import { ChromePicker } from "react-color";

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

function Landing({ }) {
	const [vertex, setVertex] = useState("");
	const [fragment, setFragment] = useState("");
	const [playlists, setPlaylists] = useState([]);
	const [showPlaylists, setShowPlaylists] = useState(false);
	const [showMainButton, setShowMainButton] = useState(true);
	const [trackColors, setTrackColors] = useState({});
	const [genres, setGenres] = useState([]);
	const [phaseHue, setPhaseHue] = useState(0.6);
	const [blurBackground, setBlurBackground] = useState(false);
	const [staticScene, setStaticScene] = useState(true);

	const [showAlternateBox, setShowAlternateBox] = useState(false);
  	const [showColorPicker, setShowColorPicker] = useState(false);
	const [pickedColor, setPickedColor] = useState("#1DB954");

	useEffect(() => {
		// fetch the vertex and fragment shaders from public folder 
		axios.get("/shader/vertexShader.glsl").then((res) => setVertex(res.data));
		// axios.get("/shader/fragmentShader.glsl").then((res) => setFragment(res.data));
		axios.get("/shader/auroraFragment.glsl").then((res) => setFragment(res.data));
	}, []);

	useEffect(() => {
		setPhaseHue(hexToHue(pickedColor));
	  }, [pickedColor]);

	const handleLogin = () => {
		window.location.href = "http://localhost:8888/login";
	};

	// On mount, check if login has completed by inspecting query params
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("loggedIn") === "true") {
			axios
				.get("http://localhost:8888/playlists")
				.then((res) => {
					setPlaylists(res.data); // assuming res.data is an array of playlists
					setShowPlaylists(true);
					setShowMainButton(false);
				})
				.catch((err) => console.error("Error fetching playlists:", err));
		}
	}, []);

	const fetchPlaylistTracks = (playlistId) => {
		axios
		  .get(`http://localhost:8888/playlist-tracks/${playlistId}`)
		  .then((res) => {
			console.log("Playlist tracks data:", res.data);
			// Assuming res.data.genreCounts is an array of objects with properties: genre, count, color
			if (res.data.genreCounts && res.data.genreCounts.length > 0) {
			  // Use the top genre's color
			  const topGenre = res.data.genreCounts[0];
			  if (topGenre && topGenre.color) {
				const newHue = hexToHue(topGenre.color);
				setPhaseHue(newHue);
			  }
			}
			// Hide the playlist box after clicking on a playlist
			setShowPlaylists(false);
			setTrackColors(res.data.colors);
			setGenres(res.data.genreCounts); // Store sorted genre list
			setBlurBackground(false);
			setStaticScene(false);
		  })
		  .catch((err) => console.error("Error fetching playlist tracks", err));
	  };

	const handleAlternatePlaylistClick = (playlistId) => {
	// Optionally, you could store playlistId if needed.
		setShowColorPicker(true);
	};

	const handleColorChange = (event) => {
		const hex = event.target.value;
		const newHue = hexToHue(hex);
		setPhaseHue(newHue);
		setShowAlternateBox(false);
		setShowColorPicker(false);
		setBlurBackground(false);
		setStaticScene(false);
	  };
	

	const handleMenuClick = () => {
		if(!showPlaylists)
			setShowPlaylists(true);
		else
			setShowPlaylists(false);
		// setBlurBackground(true);
	};

	return (
		<div style={styles.container}>
			{/* Blurred static Aurora background */}
			<div style={{ ...styles.background, filter: blurBackground ? "blur(5px)" : "none" }}>
				<Canvas 
					camera={{ position: [0, 0, 5], fov: 75 }} 
					style={{ width: "100vw", height: "100vh",  }}
					gl={{ alpha: false }}>
					<AuroraScene vertex={vertex} fragment={fragment} phaseHue={phaseHue} staticScene={staticScene} />
				</Canvas>
			</div>

			{/* Foreground UI */}
			<button onClick={handleMenuClick} style={styles.hamburgerButton}>&#9776;</button>
			
			{showMainButton && (
				<button onClick={handleLogin} style={styles.centerButton}>Get Started</button>
			)}

			{showPlaylists && (
				<div style={styles.playlistBox}>
					<h2 style={styles.playlistTitle}>Your Playlists</h2>
					<div style={styles.playlistList}>
						{playlists.length > 0 ? (
							playlists.map((playlist) => (
								<div key={playlist.id} style={styles.playlistItem} onClick={() => fetchPlaylistTracks(playlist.id)}>
									{playlist.name}
								</div>
							))
						) : (
							<p style={styles.noPlaylists}>No playlists available.</p>
						)}
					</div>
					<div style={styles.alternateOption} onClick={() => setShowColorPicker(true)}>
						Visualize it differently?
					</div>
				</div>
			)}

			{/* {showAlternateBox && (
					<div style={styles.alternateBox}>
					<h2 style={styles.playlistTitle}>Alternate Playlists</h2>
					<div style={styles.playlistList}>
						{playlists.length > 0 ? (
						playlists.map((playlist) => (
							<div
							key={playlist.id}
							style={styles.playlistItem}
							onClick={() => handleAlternatePlaylistClick(playlist.id)}
							>
							{playlist.name}
							</div>
						))
						) : (
						<p style={styles.noPlaylists}>No playlists available.</p>
						)}
					</div>
					</div>
				)} */}

			{showColorPicker && (
					<div style={styles.colorPickerOverlay}>
					<ChromePicker
						color={pickedColor}
						onChange={(color) => setPickedColor(color.hex)}
					/>
					<button
						style={styles.confirmButton}
						onClick={() => setShowColorPicker(false)}
					>
						Done
					</button>
					</div>
				)}
		</div>
	);
}

const styles = {
	container: {
	  position: "relative",
	  height: "100vh",
	  width: "100vw",
	  overflow: "hidden",
	},
	background: {
	  position: "absolute",
	  top: 0,
	  left: 0,
	  width: "100vw",
	  height: "100vh",
	  zIndex: -1,
	  overflow: "hidden",
	},
	hamburgerButton: {
	  position: "absolute",
	  top: "20px",
	  right: "20px",
	  backgroundColor: "transparent",
	  border: "none",
	  fontSize: "30px",
	  cursor: "pointer",
	  color: "#FFFFFF", // White icon color
	  zIndex: 2,
	},
	centerButton: {
	  position: "absolute",
	  top: "50%",
	  left: "50%",
	  transform: "translate(-50%, -50%)",
	  padding: "15px 30px",
	  fontSize: "18px",
	  borderRadius: "30px",
	  border: "none",
	  backgroundColor: "#1DB954", // Spotify green
	  color: "#fff",
	  cursor: "pointer",
	  zIndex: 2,
	},
	playlistBox: {
	  position: "absolute",
	  top: "10%",
	  left: "50%",
	  transform: "translateX(-50%)",
	  width: "80%",
	  maxWidth: "500px",
	  maxHeight: "70vh",
	  backgroundColor: "#222222", // Dark background for the box
	  borderRadius: "10px",
	  padding: "20px",
	  overflowY: "auto",
	  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.5)",
	  zIndex: 2,
	},
	playlistTitle: {
	  margin: "0 0 10px 0",
	  textAlign: "center",
	  color: "#ffffff", // White text
	  fontSize: "20px",
	},
	playlistList: {
	  display: "flex",
	  flexDirection: "column",
	  gap: "10px",
	},
	playlistItem: {
	  padding: "12px",
	  backgroundColor: "#2e2e2e", // Slightly lighter dark gray
	  borderRadius: "5px",
	  cursor: "pointer",
	  color: "#ffffff",
	  fontSize: "16px",
	  // Optionally add a subtle border:
	  // border: "1px solid #3a3a3a",
	},
	noPlaylists: {
	  textAlign: "center",
	  color: "#bbbbbb", // Light gray for empty state
	},
	alternateOption: {
		marginTop: "15px",
		padding: "10px",
		textAlign: "center",
		backgroundColor: "#333333",
		borderRadius: "5px",
		cursor: "pointer",
		color: "#fff",
		fontSize: "16px",
	  },
	  alternateBox: {
		position: "absolute",
		top: "20%",
		left: "50%",
		transform: "translateX(-50%)",
		width: "80%",
		maxWidth: "500px",
		maxHeight: "70vh",
		backgroundColor: "#222222",
		borderRadius: "10px",
		padding: "20px",
		overflowY: "auto",
		boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
		zIndex: 3,
	  },
	  colorPickerOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100vw",
		height: "100vh",
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.7)",
		zIndex: 4,
	  },
	  colorPicker: {
		width: "100px",
		height: "100px",
		border: "none",
		cursor: "pointer",
	  },
  };
  

export default Landing;