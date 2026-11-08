import { AtomicResultLink } from '@coveo/atomic-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Result } from '@coveo/headless';
import { type JSX, useState } from 'react';
import { cardTint, readTypes, typeBadge } from './pokemonTypes.ts';
import { POKEBALL_IMAGE } from './settings.ts';
import { useShadowStyles } from './useShadowStyles.ts';

export const POKEMON_RESULT_FIELDS = [
  'pokemon_name',
  'pokemon_image',
  'pokemon_number',
  'pokemon_type',
  'pokemon_generation',
];

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function PokemonImage({ image, name }: { image: string; name: string }): JSX.Element {
  const [failed, setFailed] = useState(false);
  const usesFallback = failed || !image;

  return (
    <img
      data-slot="pokemon-image"
      className={cn(
        'size-full object-contain mix-blend-multiply transition-transform duration-150 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100',
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
  const isKnown = number !== '' && number !== '???';

  return (
    <div className="flex justify-between text-[13px] font-bold text-muted-foreground">
      <span>{isKnown ? `#${number}` : ''}</span>
      <span>{generation.replace('Generation', 'Gen')}</span>
    </div>
  );
}

export function PokemonResult({ result }: { result: Result }): JSX.Element {
  const { raw } = result;
  const name = text(raw.pokemon_name);
  const types = readTypes(raw.pokemon_type);
  const shadowStyles = useShadowStyles();

  return (
    <article
      ref={shadowStyles}
      data-slot="pokemon-card"
      className="group flex h-full flex-col overflow-hidden rounded-[20px] border-2 border-b-[5px] border-border bg-card font-sans transition duration-150 hover:-translate-y-1 hover:border-border-strong motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div
        className="flex aspect-[4/3] items-center justify-center overflow-hidden p-3.5"
        style={{ background: cardTint(types) }}
      >
        <PokemonImage image={text(raw.pokemon_image)} name={name} />
      </div>
      <div className="px-4 pt-3.5 pb-4">
        <CardMeta number={text(raw.pokemon_number)} generation={text(raw.pokemon_generation)} />
        <h2 className="mt-0.5 mb-2.5 text-lg/snug font-extrabold text-foreground">
          <AtomicResultLink>{name}</AtomicResultLink>
        </h2>
        <ul className="flex flex-wrap gap-1.5">
          {types.map((type) => (
            <li key={type}>
              <Badge className="px-3 text-[13px] font-extrabold" style={typeBadge(type)}>
                {type}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
