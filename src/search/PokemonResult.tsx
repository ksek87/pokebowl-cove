import {
  AtomicResultImage,
  AtomicResultLink,
  AtomicResultSectionTitle,
  AtomicResultSectionVisual,
  AtomicResultText,
} from '@coveo/atomic-react';

export const POKEMON_RESULT_FIELDS = ['pokemon_name', 'pokemon_image'];

export function PokemonResult() {
  return (
    <>
      <AtomicResultSectionVisual>
        <AtomicResultImage
          field="pokemon_image"
          imageAltField="pokemon_name"
          fallback="/pokeball.svg"
        />
      </AtomicResultSectionVisual>
      <AtomicResultSectionTitle>
        <AtomicResultLink>
          <AtomicResultText field="pokemon_name" />
        </AtomicResultLink>
      </AtomicResultSectionTitle>
    </>
  );
}
