import React, { useEffect, useRef, useState } from "react";
import CanvasGradient from "canvas-gradient";

const GradientStrip = ({ colors }) => {
	if (!colors || colors.length === 0) return null;
  
	const gradientStyle = {
	  width: "600px",
	  height: "50px",
	  background: `linear-gradient(to right, ${colors.join(", ")})`,
	  marginTop: "20px",
	  borderRadius: "10px",
	//   filter: "blur(5px)",
	};
  
	return <div style={gradientStyle}></div>;
  };

export default GradientStrip;