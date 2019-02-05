export class Query {
  id: string;
  name: string;
  cypher: string;
  params: string;
  queryType: string = "read";
  batchKey: string = "labelsRemoved";
  status: string = "new";
  result: any;
  get paramsObject() {
    try {
      return JSON.parse(this.params);
    } catch {
      return {};
    }
  }
}
