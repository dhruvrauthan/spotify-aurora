import React, { useEffect, useRef } from "react";
import MeshGradient from "mesh-gradient.js";

const MeshGradientBackground = ({ colors }) => {
  const canvasId = "mesh-gradient-canvas";
  const gradient = useRef(null);

  useEffect(() => {
    if (!gradient.current && colors.length > 0) {
      gradient.current = new MeshGradient();
      gradient.current.initGradient("#" + canvasId, colors);
      gradient.current.changePosition(780);
    }

    return () => {
      gradient.current = null;
    };
  }, [colors]);

  return (
    <canvas
      id={canvasId}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1, // Gradient is behind the stars
      }}
    />
  );
};

export default MeshGradientBackground;