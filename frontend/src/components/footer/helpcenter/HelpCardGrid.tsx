"use client";

import HelpCard from "./HelpCard";

type CardData = {
    icon: string;
    title: string;
    description: string;
};

type HelpCardGridProps = {
    cards: CardData[];
};

const HelpCardGrid = ({ cards }: HelpCardGridProps) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {cards.map((card, idx) => (
                <HelpCard
                    key={idx}
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                />
            ))}
        </div>
    );
};

export default HelpCardGrid;