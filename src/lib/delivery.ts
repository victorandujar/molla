// Home delivery on Wednesdays and Saturdays, same window and towns. The rest of the Baix Llobregat picks up in Sant Boi.
// Shared by the page, the schemas and the emails: change zones only here.
export const deliveryWindow = '12:00–14:00';
export const deliveryTowns = [
  { id: 'sant-boi', name: 'Sant Boi de Llobregat' },
  { id: 'sant-just', name: 'Sant Just Desvern' },
  { id: 'santa-coloma', name: 'Santa Coloma de Cervelló' },
] as const;
export type TownId = (typeof deliveryTowns)[number]['id'];
export const townById = (id: string) => deliveryTowns.find((t) => t.id === id);
