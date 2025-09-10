import { useEffect, useState } from "react";

interface BitParticle {
  id: number;
  x: number;
  y: number;
  opacity: number;
  size: number;
  delay: number;
  bit: string;
}

const MouseFollowingBits = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<BitParticle[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => {
        // Add new particle
        const newParticle: BitParticle = {
          id: Date.now(),
          x: mousePos.x,
          y: mousePos.y,
          opacity: 1,
          size: Math.random() * 12 + 8,
          delay: Math.random() * 100,
          bit: Math.random() > 0.5 ? '1' : '0'
        };

        // Update existing particles and remove old ones
        const updatedParticles = prev
          .map(particle => ({
            ...particle,
            opacity: particle.opacity - 0.02,
            x: particle.x + (Math.random() - 0.5) * 2,
            y: particle.y + (Math.random() - 0.5) * 2,
          }))
          .filter(particle => particle.opacity > 0);

        return [...updatedParticles, newParticle].slice(-20); // Keep max 20 particles
      });
    }, 50);

    return () => clearInterval(interval);
  }, [mousePos]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute text-crypto-green font-mono font-bold transition-all duration-100 ease-out"
          style={{
            left: particle.x - particle.size / 2,
            top: particle.y - particle.size / 2,
            opacity: particle.opacity,
            fontSize: `${particle.size}px`,
            transform: `scale(${particle.opacity})`,
            textShadow: `0 0 ${particle.size}px hsl(var(--crypto-green) / 0.5)`,
            animation: `bit-glow 0.5s ease-out`,
          }}
        >
          {particle.bit}
        </div>
      ))}
    </div>
  );
};

export default MouseFollowingBits;