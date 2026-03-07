import Image from 'next/image';
import { useTransactions } from '../hooks/useTransactions';
import { useAssignments } from '../hooks/useAssignments';
import { useEffect, useMemo, useState } from 'react';

const MESSAGE_POOLS = {
    welcome: [
        "Welcome to CashCat! Let's track some pennies!",
        "Ready to master your money? Let's start today!",
        "New account, new goals. Welcome to the den!",
        "Time to get those finances purr-fectly organized!",
        "CashCat is here to help you guard your stash.",
        "I've got my eye on your goals! Let's get started.",
        "CashCat's scratching post is ready for some data!",
        "Welcome! I promise not to knock your budget off the table.",
        "Let's make some financial magic happen together!",
        "CashCat is suited up and ready to crunch some numbers."
    ],
    start: [
        "Purr-fect start! Keep adding your transactions.",
        "Every penny counts! You're doing great so far.",
        "Small steps lead to big piles of yarn... or cash!",
        "Building a habit is the hardest part. You've got this!",
        "CashCat is impressed by your early hustle.",
        "I'm keeping a tally of your progress right here!",
        "Steady paws win the race. Keep it up!",
        "You're making CashCat's whiskers twitch with joy.",
        "That's some fine bookkeeping! Let's keep the momentum.",
        "I'm tailing your expenses - great job staying on top!"
    ],
    consistent: [
        "You're a cool cat when it comes to money.",
        "Look at that consistency! Your wallet is smiling.",
        "You've got the whiskers for this budgeting thing.",
        "Your financial future is looking bright and shiny!",
        "CashCat gives your discipline a big thumbs up.",
        "You're making this look easy. I'm proud of you!",
        "No cat-napping on this budget! You're focused.",
        "I've never seen a human with such sharp instincts.",
        "CashCat is taking notes on your financial mastery.",
        "You're definitely the alpha of this budget."
    ],
    master: [
        "CashCat is proud of your progress. You're on fire!",
        "Absolute legend! Your discipline is unmatched.",
        "Top of the food chain! You've mastered your budget.",
        "Is it getting hot in here? Because your streak is sizzling!",
        "CashCat is officially retiring... you've got this handled!",
        "I'm doing a victory lap for your massive streak!",
        "You've got the Midas touch (and the CashCat seal of approval).",
        "Your bank account is looking like a high-score screen!",
        "CashCat bows down to the master of the monthly spend.",
        "You're not just tracking money; you're building an empire!"
    ]
};

export default function MascotMessage() {
    const { data: allTransactions = [] } = useTransactions();
    const { data: allAssignments = [] } = useAssignments();
    const [showMascotMessage, setShowMascotMessage] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const applySetting = () => {
            const raw = localStorage.getItem('showMascotMessage');
            setShowMascotMessage(raw === null ? true : raw === 'true');
        };

        applySetting();

        const onSettingChanged = () => applySetting();
        window.addEventListener('showMascotMessageChanged', onSettingChanged);
        window.addEventListener('storage', onSettingChanged);

        return () => {
            window.removeEventListener('showMascotMessageChanged', onSettingChanged);
            window.removeEventListener('storage', onSettingChanged);
        };
    }, []);

    // Calculate a combined set of days the user has been active
    const streak = useMemo(() => {
        const uniqueDays = new Set<string>();
        
        allTransactions.forEach(t => uniqueDays.add(t.created_at.split('T')[0]));
        allAssignments.forEach(a => {
            if (a.created_at) uniqueDays.add(a.created_at.split('T')[0]);
        });

        return uniqueDays.size;
    }, [allTransactions, allAssignments]);

    const message = useMemo(() => {
        let pool = MESSAGE_POOLS.welcome;
        if (streak > 0 && streak < 5) pool = MESSAGE_POOLS.start;
        else if (streak >= 5 && streak < 15) pool = MESSAGE_POOLS.consistent;
        else if (streak >= 15) pool = MESSAGE_POOLS.master;

        return pool[Math.floor(Math.random() * pool.length)];
    }, [streak]);

    if (!showMascotMessage) return null;

    return (
        <div className="flex items-center gap-4 bg-white/5 md:bg-transparent border border-white/10 md:border-none rounded-2xl p-2 md:p-0 my-2 md:m-0 shadow-sm md:shadow-none hover:bg-white/10 md:hover:bg-transparent transition-colors">
            <div className="flex-shrink-0 bg-green/10 rounded-full p-2 md:p-1 border border-green/20 md:border-none md:hidden">
                <Image src="/logo.png" alt="CashCat Mascot" width={46} height={46} className="rounded-full w-8 h-8 md:w-10 md:h-10" />
            </div>
            <div className="flex-1 ">
                <h3 className="text-white font-bold text-sm flex items-center gap-2 text-left md:text-center">
                    {message}
                    <span className="text-xl md:text-base">🐾</span>
                </h3>
                <p className="text-white/60 text-xs mt-0.5 text-left md:text-center">
                    You've budgeted for <span className="text-green font-bold">{streak}</span> days.
                </p>
            </div>

        </div>
    );
}
