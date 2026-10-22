// THE SEASON SWITCH: change the one word below twice a year (see "Service times" in README.md).
//   'school-year'  September to early June: Church Service 10:30 am, Sunday School 9:30 am
//   'summer'       Summer: one Church Service at 9:30 am, no Sunday School
// Loaded in every page's <head> so the right times show before the page is drawn.
// Season-specific text in the pages is marked data-season-only="school-year" or "summer".
const SEASON = 'school-year';

document.documentElement.dataset.season = SEASON;
