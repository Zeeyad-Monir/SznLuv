// Bundled photos keyed by the catalogue name shared by cards and details.
const spotImages = {
  'Aldor Family Farm': require('../assets/FamilyFarm.jpg'),
  'Eagle Acres Dairy': require('../assets/EagleAcres.png'),
  'Laity Pumpkin Patch': require('../assets/Laity.png'),
  'Richmond Country Farms': require('../assets/Seasonal/fall/richmond-country-farms.jpg'),
  'Westham Island Herb Farm': require('../assets/Seasonal/fall/westham-island-herb-farm.jpg'),
  'Hazelmere Pumpkin Patch': require('../assets/Seasonal/fall/hazelmere-pumpkin-patch.jpg'),
  'The Bog Cranberry Farm': require('../assets/Seasonal/fall/the-bog-cranberry-farm.jpg'),
  'Hopcott Farms Cranberry Tours': require('../assets/Seasonal/fall/hopcott-farms-cranberry-tours.jpg'),
  'Maan Farms': require('../assets/Seasonal/fall/maan-farms.jpg'),
  'Taves Family Farms': require('../assets/Seasonal/fall/taves-family-farms.jpg'),
};

const goToVanCredit = (photoId, changes) => ({
  author: 'GoToVan',
  sourceUrl: `https://www.flickr.com/photos/gotovan/${photoId}`,
  license: 'CC BY 2.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  changes,
});

export const spotPhotoCredits = {
  'Richmond Country Farms': goToVanCredit('30144361371', 'Resized and cropped to fit'),
  'Westham Island Herb Farm': {
    author: 'FernShade',
    sourceUrl: 'https://www.flickr.com/photos/spring-song072/21992123250',
  },
  'Hazelmere Pumpkin Patch': {
    author: 'Gabriel Farms',
    sourceUrl: 'https://www.hazelmerepumpkinpatch.ca/copy-of-home',
  },
  'The Bog Cranberry Farm': {
    author: 'Riverside Cranberry Farm',
    sourceUrl: 'https://www.riversidecranberries.ca/gallery',
  },
  'Hopcott Farms Cranberry Tours': {
    author: 'Ocean Spray',
    sourceUrl: 'https://www.oceanspray.com/our-farmers/hopcott-family',
  },
  'Maan Farms': goToVanCredit('50468762542', 'Resized and cropped'),
  'Taves Family Farms': goToVanCredit('51518353333', 'Resized and cropped'),
};

export default spotImages;
