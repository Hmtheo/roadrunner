import type { MappingConfig } from '../types'
import { fetchLinearData, type LinearData } from './linearAdapter'
import { MOCK_ITEMS, MOCK_GROUPS, MOCK_CATEGORIES } from '../data/mockData'

export async function loadData(source: 'linear' | 'demo', config: MappingConfig): Promise<LinearData> {
  if (source === 'linear') {
    return fetchLinearData(config)
  }

  return {
    items: MOCK_ITEMS,
    groups: MOCK_GROUPS,
    categories: MOCK_CATEGORIES,
  }
}
