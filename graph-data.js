export const nodes = [
  { id: "Main Gate", short: "GATE", description: "Primary campus entrance", position: [-3.2, 0.1, 0.1] },
  { id: "Library", short: "LIB", description: "Central academic resource building", position: [-1.4, 1.5, -1.0] },
  { id: "Hostel", short: "HOSTEL", description: "Student residential area", position: [-1.9, -1.3, 1.2] },
  { id: "Academic Block", short: "ACADEMIC", description: "Teaching and classroom complex", position: [0.8, 1.1, 1.0] },
  { id: "Cafeteria", short: "CAFE", description: "Campus dining facility", position: [1.1, -1.0, -0.7] },
  { id: "Sports Complex", short: "SPORTS", description: "Sports and recreation facility", position: [3.1, 0.2, 0.2] }
];

// Illustrative weights from the supplied project guide; units are not measured distances.
export const edges = [
  ["Main Gate", "Library", 4],
  ["Main Gate", "Hostel", 2],
  ["Library", "Academic Block", 3],
  ["Hostel", "Library", 1],
  ["Hostel", "Cafeteria", 6],
  ["Academic Block", "Cafeteria", 2],
  ["Academic Block", "Sports Complex", 5],
  ["Library", "Cafeteria", 3],
  ["Cafeteria", "Sports Complex", 1]
];
