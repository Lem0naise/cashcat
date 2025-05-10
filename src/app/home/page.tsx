'use client';
import Image from "next/image";
import Navbar from "../components/navbar";
import Sidebar from "../components/sidebar";
import MobileNav from "../components/mobileNav";
import ProtectedRoute from "../components/protected-route";
import {useEffect, useState, useRef} from "react";

export default function Home() {
    // ...existing state definitions...

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
                // ...existing content...
            </div>
        </ProtectedRoute>
    );
}