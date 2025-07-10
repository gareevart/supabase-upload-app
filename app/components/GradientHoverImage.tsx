"use client"

import Image from 'next/image';
import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

interface GradientHoverImageProps {
  src: string;
  alt: string;
  className?: string;
  width: number;
  height: number;
  priority?: boolean;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
}

export default function GradientHoverImage({
  src,
  alt,
  className,
  width,
  height,
  priority,
  onMouseEnter: externalOnMouseEnter,
  onMouseLeave: externalOnMouseLeave,
}: GradientHoverImageProps) {
  const gradientElementRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<gsap.core.Tween | null>(null);

  // Создаем градиентный элемент при монтировании
  useEffect(() => {
    const gradientElement = document.createElement('div');
    gradientElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at var(--mouse-x) var(--mouse-y), 
        #C09EF7 0%, 
        #5B3F88 25%, 
        transparent 50%);
      opacity: 0;
      pointer-events: none;
      z-index: -1;
    `;
    
    document.body.appendChild(gradientElement);
    gradientElementRef.current = gradientElement;

    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.body.classList.remove('gradient-active');
      if (gradientElementRef.current) {
        document.body.removeChild(gradientElementRef.current);
      }
    };
  }, []);

  const handleMouseMove = (e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    
    document.documentElement.style.setProperty('--mouse-x', `${x}px`);
    document.documentElement.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!gradientElementRef.current) return;

    // Останавливаем предыдущую анимацию
    if (animationRef.current) {
      animationRef.current.kill();
    }

    // Убираем обработчик движения мыши
    document.removeEventListener('mousemove', handleMouseMove);

    const x = e.clientX;
    const y = e.clientY;
    
    document.documentElement.style.setProperty('--mouse-x', `${x}px`);
    document.documentElement.style.setProperty('--mouse-y', `${y}px`);
    
    // Добавляем класс для изменения стилей ссылок
    document.body.classList.add('gradient-active');

    // GSAP анимация расширения
    animationRef.current = gsap.fromTo(gradientElementRef.current, 
      { 
        opacity: 0,
        scale: 0,
        transformOrigin: `${x}px ${y}px`
      },
      { 
        opacity: 1,
        scale: 3,
        duration: 0.8,
        ease: "power2.out"
      }
    );

    externalOnMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (!gradientElementRef.current) return;

    // Останавливаем предыдущую анимацию
    if (animationRef.current) {
      animationRef.current.kill();
    }

    const x = e.clientX;
    const y = e.clientY;
    
    document.documentElement.style.setProperty('--mouse-x', `${x}px`);
    document.documentElement.style.setProperty('--mouse-y', `${y}px`);

    // Добавляем обработчик движения мыши
    document.addEventListener('mousemove', handleMouseMove);
    
    // GSAP анимация сжатия с отслеживанием курсора
    animationRef.current = gsap.to(gradientElementRef.current, {
      opacity: 0,
      scale: 0,
      duration: 0.8,
      ease: "power2.in",
      onComplete: () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.body.classList.remove('gradient-active');
      }
    });

    externalOnMouseLeave?.(e);
  };

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      priority={priority}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
}
