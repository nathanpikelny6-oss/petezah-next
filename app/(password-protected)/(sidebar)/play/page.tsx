/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import MarqueeBg from "@/ui/backgrounds/marquee-bg";
import { useSearchParams } from "next/navigation";
import { BsFullscreen } from "react-icons/bs";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { FaDiscord, FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import { GameData } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import ModOptions from "@/ui/play/mod-options";

export default function Page() {
  const searchParams = useSearchParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isRating, setIsRating] = useState(false);
  const [gameData, setGameData] = useState<GameData>();
  const [user, setUser] = useState<User | null>(null);

  const decodedUrl = decodeURIComponent(searchParams.get("url") || "");
  const id = searchParams.get("id") || null;

  console.log("Decoded URL:", decodedUrl);
  console.log("Game ID:", id);

  useEffect(() => {
    const supabase = createClient();
    async function fetchSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    }
    fetchSession();
  }, []);

  useEffect(() => {
    async function fetchGame() {
      const res = await fetch("/api/g-data");
      const data = await res.json();
      const game = data.games.find((g: GameData) => g._id === id);
      if (game) setGameData(game);
    }
    if (id) fetchGame();
  }, [id]);

  function toggleFullscreen() {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (iframe.requestFullscreen) iframe.requestFullscreen();
    else if ((iframe as any).mozRequestFullScreen)
      (iframe as any).mozRequestFullScreen();
    else if ((iframe as any).webkitRequestFullscreen)
      (iframe as any).webkitRequestFullscreen();
    else if ((iframe as any).msRequestFullscreen)
      (iframe as any).msRequestFullscreen();
  }

  function refreshIframe() {
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  }

  function openIframeSource() {
    if (iframeRef.current) window.open(iframeRef.current.src, "_blank");
  }

  function DCMessage() {
    alert(
      "Unfortunately, we no longer are allowing users to access our Discord server through our website as people have been abusing the service that we use. However, you can join the server by using the link provided in the next screen."
    );
    if (
      window.confirm(
        "Click OK to open the Discord server, or Cancel to stay here."
      )
    ) {
      window.open("https://discord.gg/GqshrYNn62", "_blank");
    }
  }

  let averageRating: number | null = null;
  if (gameData?.stars?.length) {
    averageRating =
      gameData.stars.reduce((sum, s) => sum + s.rating, 0) /
      gameData.stars.length;
  }

  async function addStar(userId: string, rating: number) {
    if (!user) return;
    setGameData((prev) => {
      if (!prev) return prev;
      const stars = prev.stars ? [...prev.stars] : [];
      const index = stars.findIndex((s) => s.userId === userId);
      if (index !== -1) stars[index] = { userId, rating };
      else stars.push({ userId, rating });
      return { ...prev, stars, categories: prev.categories ?? [] };
    });
    await fetch("/api/rate-g-stars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ gameId: id, rating }),
    });
  }

  type StarRatingProps = {
    rating: number;
    onRate: (rating: number) => void;
    userRating?: number;
  };

  function StarRating({ rating, onRate, userRating }: StarRatingProps) {
    const [hoverRating, setHoverRating] = useState(0);
    const displayRating = hoverRating || userRating || rating;
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => {
          let icon;
          if (displayRating >= i) icon = <FaStar size={40} />;
          else if (displayRating >= i - 0.5) icon = <FaStarHalfAlt size={40} />;
          else icon = <FaRegStar size={40} />;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onRate(i)}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
              className="text-yellow-400 transition-colors hover:text-yellow-500 px-0.5!"
            >
              {icon}
            </button>
          );
        })}
        <span className="ml-2 text-xl font-semibold text-center text-white">
          - {rating.toFixed(1)}{" "}
          {gameData?.stars &&
            `(${gameData.stars.length} rating${
              gameData.stars.length !== 1 ? "s" : ""
            })`}
        </span>
      </div>
    );
  }

  if (!decodedUrl) {
    return (
      <div className="flex items-center relative justify-center h-[100%]">
        <MarqueeBg />
        <div>
          <h1 className="text-center p-[50px]! rounded-[12px] border-2 text-3xl border-[#0096FF] backdrop-blur-md backdrop-filter backdrop-opacity-50 bg-[#0A1D37]">
            No URL provided
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center relative justify-center h-[100%]">
      <MarqueeBg />
      <div className="z-1 h-[90%] w-[90%] border-[#0096FF] bg-[#0A1D37] border-2 rounded-2xl p-2! flex flex-col">
        {!isRating ? (
          <iframe
            title="content-frame"
            className="flex-1 w-full bg-white h-max rounded-t-2xl"
            src={decodedUrl}
            ref={iframeRef}
          ></iframe>
        ) : (
          <div className="flex items-center justify-center flex-col gap-2 flex-1 w-full bg-[#0A1D37] h-max">
            <h1 className="text-4xl">Ratings for this game</h1>
            <StarRating
              rating={averageRating || 0}
              userRating={
                user
                  ? gameData?.stars?.find((s) => s.userId === user.id)?.rating
                  : undefined
              }
              onRate={user ? (r) => addStar(user.id, r) : () => {}}
            />
            {!user ? (
              <p>Sign in to rate a game</p>
            ) : (
              <p>Click on a star above to rate this game</p>
            )}
            <ModOptions gameData={gameData} setGameData={setGameData} />
          </div>
        )}
        <div className="bg-black h-[100px] w-full rounded-b-2xl border-white border-t-2 flex justify-around items-center">
          <button
            type="button"
            title="Refresh iframe"
            onClick={refreshIframe}
            className="border-2 border-gray-400 rounded-full hover:bg-gray-900 p-4! hover:scale-110 transition-all duration-500"
          >
            <ArrowPathIcon width={30} height={30} />
          </button>
          <button
            type="button"
            title="Toggle fullscreen"
            onClick={toggleFullscreen}
            className="border-2 border-gray-400 rounded-full hover:bg-gray-900 p-[21px]! hover:scale-110 transition-all duration-500"
          >
            <BsFullscreen size={20} />
          </button>
          <button
            type="button"
            title="Open in new tab"
            onClick={openIframeSource}
            className="border-2 border-gray-400 rounded-full hover:bg-gray-900 p-4! hover:scale-110 transition-all duration-500"
          >
            <ArrowTopRightOnSquareIcon width={30} height={30} />
          </button>
          <button
            type="button"
            title="Discord information"
            onClick={DCMessage}
            className="border-2 border-gray-400 rounded-full hover:bg-gray-900 p-4! hover:scale-110 transition-all duration-500"
          >
            <FaDiscord size={30} />
          </button>
          {id && (
            <button
              type="button"
              title="Rate game"
              onClick={() => setIsRating(!isRating)}
              className="border-2 border-gray-400 rounded-full hover:bg-gray-900 p-4! hover:scale-110 transition-all duration-500"
            >
              <FaStar size={30} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
