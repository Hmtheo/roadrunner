import type { MappingConfig, JiraMappingConfig } from '../types'
import { fetchLinearData, type LinearData } from './linearAdapter'
import { fetchJiraData, type JiraData } from './jiraAdapter'
import { MOCK_ITEMS, MOCK_GROUPS, MOCK_CATEGORIES } from '../data/mockData'

export async function loadData(
  source: 'linear' | 'jira' | 'demo',
  config: MappingConfig | JiraMappingConfig
): Promise<LinearData | JiraData> {
  if (source === 'linear') {
    return fetchLinearData(config as MappingConfig)
  }

  if (source === 'jira') {
    return fetchJiraData(config as JiraMappingConfig)
  }

  return {
    items: MOCK_ITEMS,
    groups: MOCK_GROUPS,
    categories: MOCK_CATEGORIES,
  }
}
