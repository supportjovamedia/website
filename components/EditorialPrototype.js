"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { stories, editorialRoot } from "@/lib/editorial";
export default function EditorialPrototype() {
  const [topic, setTopic] = useState("All stories");
  const topics = ["All stories", ...stories.map((story) => story.topic)];
  const shown =
    topic === "All stories"
      ? stories
      : stories.filter((story) => story.topic === topic);
  return (
    <main className="publication">
      <div className="concept-banner">
        Perspective / Fictional editorial prototype / Sample content
      </div>
      <div className="shell">
        <nav className="publication-nav" aria-label="Publication navigation">
          <Link className="publication-name" href={editorialRoot}>
            Perspective
          </Link>
          <div>
            <a href="#stories">Stories</a>
            <a href="#topics">Topics</a>
            <Link href={`${editorialRoot}/about`}>About</Link>
          </div>
        </nav>
        <section className="publication-hero">
          <div>
            <p className="kicker">
              Creative practice / Sample editorial content
            </p>
            <h1>
              A new
              <br />
              point of view.
            </h1>
            <p>{stories[0].teaser}</p>
            <Link href={`${editorialRoot}/${stories[0].slug}`} className="btn">
              Read the story
            </Link>
          </div>
          <Image
            src="/campaign/portrait.webp"
            alt={stories[0].alt}
            width={1122}
            height={1402}
            sizes="(max-width:700px) 100vw, 45vw"
            preload
          />
        </section>
        <section className="publication-stories" id="stories">
          <h2>Ideas worth a closer look.</h2>
          <div
            className="topic-filters"
            id="topics"
            aria-label="Filter stories by topic"
          >
            {topics.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={topic === name}
                onClick={() => setTopic(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <p className="filter-status" role="status">
            {shown.length} {shown.length === 1 ? "story" : "stories"} · {topic}
          </p>
          <div className="story-grid">
            {shown.map((story) => (
              <Link
                key={story.slug}
                href={`${editorialRoot}/${story.slug}`}
                className="story-card"
              >
                <Image
                  src={story.image}
                  alt={story.alt}
                  width={1122}
                  height={1402}
                  sizes="(max-width:700px) 100vw, 30vw"
                />
                <p className="kicker">{story.topic}</p>
                <h3>{story.title}</h3>
                <p>{story.teaser}</p>
                <span>Read the sample story</span>
              </Link>
            ))}
          </div>
        </section>
        <div className="publication-end">
          <p>Independent ideas. A fictional publication.</p>
          <Link href="/work/editorial-experience" className="text-link">
            Back to the JovaMedia concept study
          </Link>
        </div>
      </div>
    </main>
  );
}
