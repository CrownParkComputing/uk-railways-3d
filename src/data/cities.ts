// The 29 "major" cities that get bigger markers + a name in the cityData map.
// All coordinates are pulled from coords.ts so we keep one source of truth.

import { CITY_COORDS, LONDON_TERMINALS, WAYPOINT_CITIES } from './coords';

export interface City {
  name: string;
  lng: number;
  lat: number;
  pop: string;
  major?: boolean;
}

// Major cities — get the bigger pillar + glowing cap
export const CITIES: City[] = [
  { name: 'London',     ...coords('London'),         pop: '9.0M', major: true },
  { name: 'Birmingham', ...coords('Birmingham'),     pop: '1.1M', major: true },
  { name: 'Manchester', ...coords('Manchester'),     pop: '553K', major: true },
  { name: 'Liverpool',  ...coords('Liverpool'),      pop: '496K', major: true },
  { name: 'Leeds',      ...coords('Leeds'),          pop: '530K', major: true },
  { name: 'Sheffield',  ...coords('Sheffield'),      pop: '584K', major: true },
  { name: 'Newcastle',  ...coords('Newcastle'),      pop: '300K', major: true },
  { name: 'Edinburgh',  ...coords('Edinburgh'),      pop: '506K', major: true },
  { name: 'Glasgow',    ...coords('Glasgow'),        pop: '633K', major: true },
  { name: 'Bristol TM', ...coords('Bristol TM'),     pop: '467K', major: true },
  { name: 'Cardiff',    ...coords('Cardiff'),        pop: '362K', major: true },
  { name: 'Belfast Great Victoria Street', ...coords('Belfast Great Victoria Street'), pop: '340K', major: true },

  // Coastal + market towns
  { name: 'Southampton', ...coords('Southampton'),   pop: '252K' },
  { name: 'Plymouth',    ...coords('Plymouth'),      pop: '264K' },
  { name: 'Brighton',    ...coords('Brighton'),      pop: '290K' },
  { name: 'Portsmouth',  ...coords('Portsmouth'),    pop: '215K' },
  { name: 'Reading',     ...coords('Reading'),       pop: '233K' },
  { name: 'Oxford',      ...coords('Oxford'),        pop: '152K' },
  { name: 'Nottingham',  ...coords('Nottingham'),    pop: '311K' },
  { name: 'Leicester',   ...coords('Leicester'),     pop: '329K' },
  { name: 'Derby',       ...coords('Derby'),         pop: '257K' },
  { name: 'Swansea',     ...coords('Swansea'),       pop: '246K' },
  { name: 'York',        ...coords('York'),          pop: '208K' },
  { name: 'Aberdeen',    ...coords('Aberdeen'),      pop: '227K' },
  { name: 'Inverness',   ...coords('Inverness'),     pop: '63K' },
  { name: 'Dundee',      ...coords('Dundee'),        pop: '148K' },
  { name: 'Stirling',    ...coords('Stirling'),      pop: '94K' },
  { name: 'Carlisle',    ...coords('Carlisle'),      pop: '75K' },
  { name: 'Lancaster',   ...coords('Lancaster'),     pop: '52K' },
  { name: 'Hastings',    ...coords('Hastings'),      pop: '92K' },
  { name: 'Eastbourne',  ...coords('Eastbourne'),    pop: '101K' },
  { name: 'Canterbury East', ...coords('Canterbury East'), pop: '55K' },
  { name: 'Maidstone East',  ...coords('Maidstone East'),  pop: '94K' },
  { name: 'Dover Priory', ...coords('Dover Priory'), pop: '32K' },
  { name: 'Exeter StD',  ...coords('Exeter StD'),    pop: '130K' },
  { name: 'Bournemouth',  ...coords('Bournemouth'),  pop: '183K' },
  { name: 'Weymouth',     ...coords('Weymouth'),     pop: '53K' },
  { name: 'Penzance',     ...coords('Penzance'),     pop: '21K' },
  { name: 'Truro',        ...coords('Truro'),        pop: '19K' },
  { name: 'Newquay',      ...coords('Newquay'),      pop: '20K' },
  { name: 'Falmouth Docks', ...coords('Falmouth Docks'), pop: '24K' },
  { name: 'St Ives',      ...coords('St Ives'),      pop: '11K' },
  { name: 'Barnstaple',   ...coords('Barnstaple'),   pop: '31K' },
  { name: 'Bath Spa',     ...coords('Bath Spa'),     pop: '90K' },
  { name: 'Gloucester',   ...coords('Gloucester'),   pop: '130K' },
  { name: 'Cheltenham',   ...coords('Cheltenham'),   pop: '118K' },
  { name: 'Worcester',    ...coords('Worcester'),    pop: '100K' },
  { name: 'Hereford',     ...coords('Hereford'),     pop: '58K' },
  { name: 'Shrewsbury',   ...coords('Shrewsbury'),   pop: '72K' },
  { name: 'Wrexham',      ...coords('Wrexham'),      pop: '65K' },
  { name: 'Chester',      ...coords('Chester'),      pop: '89K' },
  { name: 'Blackpool',    ...coords('Blackpool'),    pop: '139K' },
  { name: 'Morecambe',    ...coords('Morecambe'),    pop: '34K' },
  { name: 'Barrow-in-F',  ...coords('Barrow-in-F'),  pop: '67K' },
  { name: 'Workington',   ...coords('Workington'),   pop: '26K' },
  { name: 'Middlesbrough',...coords('Middlesbrough'),pop: '175K' },
  { name: 'Hartlepool',   ...coords('Hartlepool'),   pop: '92K' },
  { name: 'Sunderland',   ...coords('Sunderland'),   pop: '277K' },
  { name: 'Stockton',     ...coords('Stockton'),     pop: '83K' },
  { name: 'Scarborough',   ...coords('Scarborough'), pop: '38K' },
  { name: 'Whitby',        ...coords('Whitby'),      pop: '13K' },
  { name: 'Hull',          ...coords('Hull'),        pop: '259K' },
  { name: 'Grimsby',       ...coords('Grimsby'),     pop: '88K' },
  { name: 'Lincoln',       ...coords('Lincoln'),     pop: '100K' },
  { name: 'Skegness',      ...coords('Skegness'),    pop: '19K' },
  { name: 'Northampton',   ...coords('Northampton'), pop: '215K' },
  { name: 'Coventry',      ...coords('Coventry'),    pop: '371K' },
  { name: 'Wolverhampton',  ...coords('Wolverhampton'),pop:'262K' },
  { name: 'Stoke',         ...coords('Stoke'),       pop: '255K' },
  { name: 'Blackburn',     ...coords('Blackburn'),   pop: '117K' },
  { name: 'Burnley',       ...coords('Burnley'),     pop: '73K' },
  { name: 'Bolton',        ...coords('Bolton'),      pop: '141K' },
  { name: 'Wigan',         ...coords('Wigan'),       pop: '82K' },
  { name: 'Thurso',        ...coords('Thurso'),      pop: '8K' },
  { name: 'Wick',          ...coords('Wick'),        pop: '7K' },
  { name: 'Mallaig',       ...coords('Mallaig'),     pop: '0.8K' },
  { name: 'Kyle of Lochalsh', ...coords('Kyle of Lochalsh'), pop: '0.5K' },
  { name: 'Fort William',  ...coords('Fort William'),pop: '11K' },
  { name: 'Oban',          ...coords('Oban'),        pop: '8K' },
  { name: 'Ayr',           ...coords('Ayr'),         pop: '46K' },
  { name: 'Galashiels',    ...coords('Galashiels'),  pop: '12K' },
  { name: 'Holyhead',      ...coords('Holyhead'),    pop: '12K' },
  { name: 'Bangor (Wales)',...coords('Wrexham'),     pop: '18K' },  // alias
  { name: 'Aberystwyth',   ...coords('Aberystwyth'),  pop: '13K' },
  { name: 'Derry',         ...coords('Derry'),       pop: '85K' },
  { name: 'Lisburn',       ...coords('Lisburn'),     pop: '47K' },
];

function coords(name: string): { lng: number; lat: number } {
  const pair = (CITY_COORDS[name] ?? LONDON_TERMINALS[name] ?? WAYPOINT_CITIES[name]) as [number, number] | undefined;
  if (!pair) throw new Error(`Missing coordinates for "${name}"`);
  return { lng: pair[0], lat: pair[1] };
}