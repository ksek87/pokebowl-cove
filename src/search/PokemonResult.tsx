import { AtomicResultLink } from '@coveo/atomic-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Result } from '@coveo/headless';
import { type JSX, useState } from 'react';
import { pokemonDetailHref } from './pokemonDetail.ts';
import { cardTint, readTypes, typeBadge } from './pokemonTypes.ts';
import { POKEBALL_IMAGE, POKEMON_FIELDS, UNKNOWN_POKEDEX_NUMBER } from './settings.ts';
import { useShadowStyles } from './useShadowStyles.ts';

export const POKEMON_RESULT_FIELDS = Object.values(POKEMON_FIELDS);

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function PokemonImage({
  image,
  name,
  className,
}: {
  image: string;
  name: string;
  className?: string;
}): JSX.Element {
  const [failed, setFailed] = useState(false);
  const usesFallback = failed || !image;

  return (
    <img
      data-slot="pokemon-image"
      className={cn(
        'size-full object-contain mix-blend-multiply transition-transform duration-150 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100',
        className,
        usesFallback && 'size-[45%] opacity-50 mix-blend-normal',
      )}
      src={usesFallback ? POKEBALL_IMAGE : image}
      alt={name}
      loading="lazy"
      onError={(): void => setFailed(true)}
    />
  );
}

function CardMeta({ number, generation }: { number: string; generation: string }): JSX.Element {
  const isKnown = number !== '' && number !== UNKNOWN_POKEDEX_NUMBER;

  return (
    <div className="flex justify-between text-(length:--text-small) font-bold text-muted-foreground">
      <span>{isKnown ? `#${number}` : ''}</span>
      <span>{generation.replace('Generation', 'Gen')}</span>
    </div>
  );
}

/** The link Atomic's grid follows when any part of the card is clicked. */
export function PokemonResultLink({ result }: { result: Result }): JSX.Element {
  return <AtomicResultLink hrefTemplate={pokemonDetailHref(text(result.raw[POKEMON_FIELDS.name]))} />;
}

export function PokemonResult({ result }: { result: Result }): JSX.Element {
  const { raw } = result;
  const name = text(raw[POKEMON_FIELDS.name]);
  const types = readTypes(raw[POKEMON_FIELDS.type]);
  const shadowStyles = useShadowStyles();

  return (
    <article
      ref={shadowStyles}
      data-slot="pokemon-card"
      className="group flex h-full flex-col overflow-hidden rounded-(--radius-panel) border-2 border-b-(length:--size-card-edge) border-border bg-card font-sans transition duration-150 hover:-translate-y-1 hover:border-border-strong active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
    >
      <div
        className="flex aspect-[4/3] items-center justify-center overflow-hidden p-3.5"
        style={{ background: cardTint(types) }}
      >
        <PokemonImage image={text(raw[POKEMON_FIELDS.image])} name={name} />
      </div>
      <div className="px-4 pt-3.5 pb-4">
        <CardMeta number={text(raw[POKEMON_FIELDS.number])} generation={text(raw[POKEMON_FIELDS.generation])} />
        <h2 className="mt-0.5 mb-2.5 text-lg/snug font-extrabold text-foreground">
          <AtomicResultLink hrefTemplate={pokemonDetailHref(name)}>{name}</AtomicResultLink>
        </h2>
        <ul className="flex flex-wrap gap-1.5">
          {types.map((type) => (
            <li key={type}>
              <Badge className="px-3 text-(length:--text-small) font-extrabold" style={typeBadge(type)}>
                {type}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
