import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerJSX & React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

interface ModelViewerJSX {
  src?: string;
  alt?: string;
  ar?: boolean;
  'ar-modes'?: string;
  'ar-scale'?: string;
  'camera-controls'?: boolean;
  'disable-zoom'?: boolean;
  'shadow-intensity'?: string;
  autoplay?: boolean;
  poster?: string;
  'interaction-prompt'?: string;
  'interaction-prompt-threshold'?: string;
  loading?: 'auto' | 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  ref?: React.Ref<HTMLElement>;
}
