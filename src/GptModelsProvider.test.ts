import { describe, expect, it } from 'bun:test';

import { GptModels, GptModelsSettings } from './GptModelsProvider.js';

describe('GptModelsSettings', () => {
  it('uses the Responses API for the cheap model', () => {
    expect(GptModelsSettings[GptModels.Cheap].useResponsesApi).toBe(true);
  });

  it('uses the Responses API for the advanced model', () => {
    expect(GptModelsSettings[GptModels.Advanced].useResponsesApi).toBe(true);
  });
});
