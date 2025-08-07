import { TextInputVariant } from '@mantine/core';

type ExtendedTextInputVariant = TextInputVariant | 'landing' | 'header';

declare module '@mantine/core' {
  export interface TextInputProps {
    variant?: ExtendedTextInputVariant;
  }
}