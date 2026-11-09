import type { JSX } from 'react';
import { POKEBALL_IMAGE } from './settings.ts';

export function SiteHeader({ isPageHeading = true }: { isPageHeading?: boolean }): JSX.Element {
  const Title = isPageHeading ? 'h1' : 'p';

  return (
    <header className="flex flex-col items-center px-(--size-gutter) pt-10 pb-4 text-center">
      <a
        className="group flex items-center gap-3 rounded-2xl text-inherit no-underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-ring"
        data-slot="home-link"
        href="/"
        aria-label="Go to the home page"
      >
        <img
          className="size-11 transition-transform duration-200 group-hover:-rotate-20 motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
          src={POKEBALL_IMAGE}
          alt=""
        />
        <Title className="text-5xl/14 font-black tracking-tight">Pokémon Search</Title>
      </a>
    </header>
  );
}
