export const QUERY_TYPES: any[] = [
  {
    value: 'read',
    viewValue: 'Read Only',
    description: 'Runs a single read transaction'
  },
  {
    value: 'write',
    veiwValue: 'Write',
    description: 'Runs a single write transaction'
  },
  {
    value: 'batch',
    viewValue: 'Batched Query',
    description: 'Runs a query until a specific summary count is zero'
  },
  {
    value: 'loadCSV',
    viewValue: 'Load CSV',
    description: 'Uses appropriate method for a query using LOAD CSV'
  }
];
