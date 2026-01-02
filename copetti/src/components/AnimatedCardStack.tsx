"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Card data interface.
 */
interface CardData {
    readonly title: string;
    readonly description: string;
    readonly image: string;
}

/**
 * Card interface for stack.
 */
interface Card {
    readonly id: number;
    readonly contentType: 1 | 2 | 3;
}

/**
 * Chart preview card data.
 */
const cardData: Record<1 | 2 | 3, CardData> = {
    1: {
        title: "Candlestick Chart",
        description: "Real-time OHLC visualization",
        image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
    },
    2: {
        title: "Line Chart",
        description: "Smooth trend analysis",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
    },
    3: {
        title: "Volume Analysis",
        description: "Market depth insights",
        image: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80",
    },
};

/**
 * Initial cards for the stack.
 */
const initialCards: Card[] = [
    { id: 1, contentType: 1 },
    { id: 2, contentType: 2 },
    { id: 3, contentType: 3 },
];

/**
 * Position styles for stacked cards.
 */
const positionStyles = [
    { scale: 1, y: 12 },
    { scale: 0.95, y: -16 },
    { scale: 0.9, y: -44 },
];

/**
 * Exit animation configuration.
 */
const exitAnimation = {
    y: 340,
    scale: 1,
    zIndex: 10,
};

/**
 * Enter animation configuration.
 */
const enterAnimation = {
    y: -16,
    scale: 0.9,
};

/**
 * Arrow icon component.
 */
function ArrowIcon(): JSX.Element {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="square"
        >
            <path d="M9.5 18L15.5 12L9.5 6" />
        </svg>
    );
}

/**
 * Card content component.
 */
function CardContent({ contentType }: { readonly contentType: 1 | 2 | 3 }): JSX.Element {
    const data = cardData[contentType];

    return (
        <div className="card-content">
            <div className="card-image">
                <img src={data.image} alt={data.title} />
            </div>
            <div className="card-footer">
                <div className="card-info">
                    <span className="card-title">{data.title}</span>
                    <span className="card-description">{data.description}</span>
                </div>
                <button type="button" className="card-button">
                    View
                    <ArrowIcon />
                </button>
            </div>
        </div>
    );
}

/**
 * Animated card component.
 */
function AnimatedCard({
    card,
    index,
    isAnimating,
}: {
    readonly card: Card;
    readonly index: number;
    readonly isAnimating: boolean;
}): JSX.Element {
    const position = positionStyles[index] ?? positionStyles[2];
    const { scale, y } = position;
    const zIndex = index === 0 && isAnimating ? 10 : 3 - index;

    const exitAnim = index === 0 ? exitAnimation : undefined;
    const initialAnim = index === 2 ? enterAnimation : undefined;

    return (
        <motion.div
            key={card.id}
            initial={initialAnim}
            animate={{ y, scale }}
            exit={exitAnim}
            transition={{
                type: "spring",
                duration: 1,
                bounce: 0,
            }}
            style={{
                zIndex,
                left: "50%",
                x: "-50%",
                bottom: 0,
            }}
            className="card-stack-item"
        >
            <CardContent contentType={card.contentType} />
        </motion.div>
    );
}

/**
 * Animated card stack component.
 * Displays a stack of cards with smooth animations.
 */
export default function AnimatedCardStack(): JSX.Element {
    const [cards, setCards] = useState(initialCards);
    const [isAnimating, setIsAnimating] = useState(false);
    const [nextId, setNextId] = useState(4);

    const handleAnimate = (): void => {
        if (isAnimating) {
            return;
        }

        setIsAnimating(true);

        const lastCard = cards[2];
        if (lastCard === undefined) {
            setIsAnimating(false);
            return;
        }

        const nextContentType = ((lastCard.contentType % 3) + 1) as 1 | 2 | 3;

        setCards([...cards.slice(1), { id: nextId, contentType: nextContentType }]);
        setNextId((prev) => prev + 1);

        // Reset animation state after transition.
        setTimeout(() => {
            setIsAnimating(false);
        }, 100);
    };

    return (
        <div className="flex w-full flex-col items-center justify-center pt-2">
            <div className="card-stack">
                <AnimatePresence initial={false}>
                    {cards.slice(0, 3).map((card, index) => (
                        <AnimatedCard
                            key={card.id}
                            card={card}
                            index={index}
                            isAnimating={isAnimating}
                        />
                    ))}
                </AnimatePresence>
            </div>

            <div className="card-stack-controls">
                <button type="button" onClick={handleAnimate} className="animate-button">
                    Animate
                </button>
            </div>
        </div>
    );
}
