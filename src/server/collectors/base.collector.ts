export interface CollectedItem {
  url: string;
  urlHash: string;
  title: string;
  description?: string;
  rawContent?: string;
  author?: string;
  publisher?: string;
  publishedAt: Date;
  imageUrl?: string;
}

export interface SourceConfig {
  id: string;
  name: string;
  url: string;
  config: Record<string, unknown>;
}

export interface Collector {
  collect(source: SourceConfig): Promise<CollectedItem[]>;
}
