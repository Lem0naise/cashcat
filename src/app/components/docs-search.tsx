'use client';
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { searchDocs, DocPage } from "../utils/docsSearch";

interface DocsSearchProps {
  className?: string;
}

export default function DocsSearch({ className = "" }: DocsSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<DocPage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce the search query
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.trim()) {
      setIsSearching(true);
      debounceTimer.current = setTimeout(() => {
        setDebouncedQuery(query);
        setIsSearching(false);
      }, 50); // Optimal debounce for small docs
    } else {
      setDebouncedQuery("");
      setIsSearching(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      const searchResults = searchDocs(debouncedQuery, 3);
      setResults(searchResults);
      setIsOpen(searchResults.length > 0 && isFocused);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [debouncedQuery, isFocused]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (results.length > 0) {
      setIsOpen(true);
    }
  }, [results.length]);

  const handleResultClick = useCallback(() => {
    setIsOpen(false);
    setIsFocused(false);
    setQuery("");
    inputRef.current?.blur();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  }, []);

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Image
            src="/magnify.svg"
            alt="Search"
            width={16}
            height={16}
            className="opacity-60"
          />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={isSearching ? "Searching..." : "Search documentation..."}
          className={`w-full pl-10 pr-4 py-3 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm placeholder:text-white/50
            ${isFocused ? 'ring-2 ring-green/20' : ''}
            ${isSearching ? 'bg-white/[.08]' : ''}
          `}
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-full bg-[#1a1a1a] border border-white/10 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
          <div className="py-2">
            <div className="px-3 py-2 text-xs text-white/50 border-b border-white/10">
              Top {results.length} result{results.length !== 1 ? 's' : ''}
            </div>
            {results.map((result, index) => (
              <Link
                key={result.slug}
                href={result.path}
                onClick={handleResultClick}
                className="block px-4 py-3 hover:bg-white/[.05] transition-colors border-b border-white/[.05] last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green/20 text-green rounded flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-green text-sm mb-1 truncate">
                      {result.title}
                    </h4>
                    <p className="text-xs text-white/60 line-clamp-2">
                      {result.description}
                    </p>
                  </div>
                  <Image
                    src="/chevron-right.svg"
                    alt=""
                    width={14}
                    height={14}
                    className="opacity-40 flex-shrink-0 mt-1"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isOpen && debouncedQuery.trim() && results.length === 0 && !isSearching && (
        <div className="absolute top-full left-0 mt-2 w-full bg-[#1a1a1a] border border-white/10 rounded-lg shadow-lg z-50">
          <div className="px-4 py-6 text-center">
            <div className="w-12 h-12 bg-white/[.05] rounded-full flex items-center justify-center mx-auto mb-3">
              <Image
                src="/docs.svg"
                alt="No results"
                width={20}
                height={20}
                className="opacity-40"
              />
            </div>
            <p className="text-sm text-white/60 mb-1">No results found</p>
            <p className="text-xs text-white/40">
              Try searching for terms like "budget", "categories", or "transactions"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
