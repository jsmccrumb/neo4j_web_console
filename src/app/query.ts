export class Query {
  id: string;
  name: string;
  cypher: string;
  params: any;
  queryType: string = "read";
  batchKey: string;
}
