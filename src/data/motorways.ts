// UK road network — major motorways + A-roads, drawn as a separate
// grey/brown tube layer (toggleable). All routes resolve to lng/lat
// via the coords module.

export interface Road {
  name: string;
  route: string[];
}

export const ROADS: Road[] = [
  { name: 'M1',   route: ['London','Luton','Milton Keynes','Northampton','Loughborough','Nottingham','Sheffield','Leeds'] },
  { name: 'M4',   route: ['London-Waterloo','Reading','Swindon','Bristol TM','Newport','Cardiff','Bridgend','Swansea'] },
  { name: 'M5',   route: ['Birmingham','Worcester','Gloucester','Bristol TM','Exeter StD','Plymouth'] },
  { name: 'M6',   route: ['Birmingham','Stafford','Crewe','Warrington','Wigan','Preston','Lancaster','Carlisle'] },
  { name: 'M25',  route: ['London-Waterloo','London-Victoria','London','London-Euston','London','London-LiverpoolSt','London-Victoria','London-Waterloo'] },
  { name: 'M40',  route: ['London','High Wycombe','Banbury','Leamington Spa','Birmingham'] },
  { name: 'M20/M2',route: ['London','Maidstone East','Ashford Intl','Folkestone','Dover Priory'] },
  { name: 'M3',   route: ['London-Waterloo','Basingstoke','Winchester','Southampton'] },
  { name: 'M62',  route: ['Liverpool','Manchester','Huddersfield','Leeds'] },
  { name: 'M60',  route: ['Manchester Vic','Manchester','Stockport','Bolton','Manchester'] },
  { name: 'M8',   route: ['Edinburgh','Glasgow'] },
  { name: 'M9',   route: ['Edinburgh','Stirling','Inverness'] },
  { name: 'M90',  route: ['Edinburgh','Perth'] },
  { name: 'M65',  route: ['Preston','Blackburn','Burnley'] },
  { name: 'M61',  route: ['Preston','Bolton','Manchester'] },
  { name: 'M66',  route: ['Manchester','Burnley'] },
  { name: 'M67',  route: ['Manchester','Glossop'] },
  { name: 'M55',  route: ['Preston','Blackpool'] },
  { name: 'M56',  route: ['Chester','Manchester','Liverpool'] },
  { name: 'M53',  route: ['Chester','Birkenhead','Liverpool'] },
  { name: 'M58',  route: ['Preston','Wigan','Liverpool'] },
  { name: 'M48',  route: ['Bristol TM','Gloucester'] },
  { name: 'M32',  route: ['Bristol TM','Bristol Parkway'] },
  { name: 'M49',  route: ['Bristol TM','Bristol Parkway'] },
  { name: 'M11',  route: ['London','Cambridge'] },
  { name: 'M23',  route: ['London','Gatwick','Brighton'] },
  { name: 'M26',  route: ['London-Waterloo','Sevenoaks'] },
  { name: 'M27',  route: ['Southampton','Portsmouth'] },
  { name: 'M271', route: ['Southampton','Romsey'] },
  { name: 'M275', route: ['Havant','Portsmouth'] },
  { name: 'A1(M)',route: ['London-KingsCross','Stevenage','Peterborough','Newark','Doncaster','York','Northallerton','Darlington','Durham','Newcastle','Edinburgh'] },
  { name: 'A2',   route: ['London','Maidstone East','Canterbury East','Dover Priory'] },
  { name: 'A3',   route: ['London-Waterloo','Guildford','Havant','Portsmouth'] },
  { name: 'A5',   route: ['London','St Albans','Milton Keynes','Towcester','Birmingham','Shrewsbury','Holyhead'] },
  { name: 'A6',   route: ['London','St Albans','Leicester','Derby','Manchester'] },
  { name: 'A9',   route: ['Stirling','Perth','Inverness'] },
  { name: 'A14',  route: ['Huntingdon','Cambridge','Newmarket','Bury St Edmunds','Ipswich'] },
  { name: 'A1',   route: ['London-KingsCross','Hitchin','Peterborough','Stamford','Newark','Doncaster','York','Scotch Corner','Darlington','Durham','Newcastle','Edinburgh'] },
  { name: 'A34',  route: ['London','Oxford','Winchester','Southampton'] },
  { name: 'A38',  route: ['Birmingham','Bristol TM','Exeter StD','Plymouth'] },
  { name: 'A66',  route: ['Bristol TM','Bridgwater','Taunton','Exeter StD'] },
  { name: 'A303', route: ['London-Waterloo','Basingstoke','Andover','Ilchester','Yeovil Jn','Honiton','Exeter StD'] },
  { name: 'A47',  route: ['Birmingham','Walsall','Cannock','Stafford','Newcastle-under-Lyme','Stoke'] },
  { name: 'M74',  route: ['Glasgow','Motherwell','Lockerbie','Carlisle'] },
  { name: 'M180', route: ['Doncaster','Scunthorpe','Hull'] },
  { name: 'A19',  route: ['Doncaster','York','Scarborough','Middlesbrough','Hartlepool','Sunderland','Newcastle','Morpeth','Alnmouth','Berwick'] },
  { name: 'A23',  route: ['London-Victoria','Gatwick','Brighton'] },
];