import React, { useState } from "react";

const LoginButton = () => {
    const [showPopup, setShowPopup] = useState(false);

    const handleLogin = () => {
        setShowPopup(true);

        // Redirect to backend login route for Spotify authentication
        setTimeout(() => {
            window.location.href = "http://localhost:8888/login";
        }, 1000);
    };

    return (
        <div>
            <button onClick={handleLogin} style={styles.button}>
                Login with Spotify
            </button>

            {showPopup && (
                <div style={styles.popup}>
                    <p>Logging in...</p>
                </div>
            )}
        </div>
    );
};

const styles = {
    button: {
        padding: "10px 20px",
        fontSize: "16px",
        backgroundColor: "#1DB954",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
    },
    popup: {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        padding: "20px",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "white",
        borderRadius: "5px",
        textAlign: "center",
    },
};

export default LoginButton;