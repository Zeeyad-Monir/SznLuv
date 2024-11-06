import {
  and,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "./src/firebaseConfig.js";

export default function App() {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");

  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  const [results, setResults] = useState("");

  function clearFields() {
    setName("");
    setType("");
    setLocation("");
  }
  // check if the plant already exists in the specified location
  async function checkIfPlantExists(plantName, plantLocation) {
    // Reference to the plants collection
    const plantsRef = collection(db, "plants");

    const q = query(
      plantsRef,
      and(
        where("name", "==", plantName),
        where("location", "==", plantLocation)
      )
    );

    // Query to find a plant with the given name
    const querySnapshot = await getDocs(q);
    console.log(plantName);

    // Check if the query returned any documents
    if (querySnapshot.empty) {
      console.log(
        `No plant with the name ${name} exists in the ${location} location.`
      );
      return false;
    } else {
      console.log("Plant with that name already exists in that location.");
      return true;
    }
  }

  // function to insert new plant in db
  async function insertNewPlant() {
    if (await checkIfPlantExists(name, location)) {
      console.log(`Plant ${name} already exists in the ${location} location.`);
      clearFields;
    } else {
      console.log(
        `Plant ${name} does not exist yet in the ${location} location - adding plant ${name}`
      );
      try {
        const docRef = doc(collection(db, "plants"));
        setDoc(docRef, {
          name: name,
          type: type,
          location: location,
        });
        console.log("Document written with ID: ", docRef.id);
        setName("");
        setType("");
        setLocation("");
        Alert.alert(
          `Plant "${name}" in "${location}" location inserted into db.`
        );
      } catch (e) {
        console.error("Error adding document: ", e);
      }
    }
  }

  // function to retrieve all plants from the database
  async function getPlants() {
    const querySnapshot = await getDocs(collection(db, "plants"));
    let allPlants = []; // for display in text box
    querySnapshot.forEach((doc) => {
      console.log(doc.id, "=>", doc.data());
      allPlants.push(
        `${JSON.stringify(doc.data().name)} // ${JSON.stringify(
          doc.data().type
        )} // ${JSON.stringify(doc.data().location)}`
      );
    });
    setResults(allPlants.join("\n"));
  }

  // function to filter plants by name, type or location
  async function filterPlants() {
    //let plantsRef = collection(db, "plants");
    let whereArr = [];

    let filteredPlants = [];

    // conditionally add filters to the query
    if (filterName) {
      //q = query(plantsRef, and(where("name", "==", filterName)));
      whereArr = [where("name", "==", filterName)];
    }

    if (filterType) {
      //q = query(plantsRef, and(where("type", "==", filterType)));
      whereArr = [...whereArr, where("type", "==", filterType)];
    }

    if (filterLocation) {
      // q = query(plantsRef, and(where("location", "==", filterLocation)));
      whereArr = [...whereArr, where("location", "==", filterLocation)];
    }

    const q = query(collection(db, "plants"), ...whereArr);
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("No matching plants found.");
    } else {
      querySnapshot.forEach((doc) => {
        console.log(doc.id, "=>", doc.data());
        filteredPlants.push(
          `${JSON.stringify(doc.data().name)} in ${JSON.stringify(
            doc.data().location
          )}`
        );
      });
      setResults(filteredPlants.join("\n"));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titleText}>My Plants</Text>

      <TouchableOpacity onPress={insertNewPlant} style={styles.buttons}>
        <Text>Add Plant</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        onChangeText={setName}
        value={name}
        placeholder="Enter plant name"
      />

      <TextInput
        style={styles.input}
        onChangeText={setType}
        value={type}
        placeholder="Enter plant type"
      />

      <TextInput
        style={styles.input}
        onChangeText={setLocation}
        value={location}
        placeholder="Enter plant location"
      />

      <TouchableOpacity onPress={getPlants} style={styles.buttons}>
        <Text>Show ALL Plants</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={filterPlants} style={styles.buttons}>
        <Text>Filter Plants</Text>
      </TouchableOpacity>

      <View style={styles.filterInputs}>
        <TextInput
          style={styles.input}
          onChangeText={setFilterName}
          value={filterName}
          placeholder="Enter plant name"
        />

        <TextInput
          style={styles.input}
          onChangeText={setFilterType}
          value={filterType}
          placeholder="Enter plant type"
        />

        <TextInput
          style={styles.input}
          onChangeText={setFilterLocation}
          value={filterLocation}
          placeholder="Enter plant location"
        />
      </View>
      <Text style={styles.outputText}>Output Area</Text>
      <Text style={styles.resultsText}>{results}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  titleText: {
    marginTop: 35,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 20,
  },
  input: {
    height: 50,
    borderWidth: 2,
    borderColor: "gray",
    margin: 10,
    marginBotton: 10,
    padding: 10,
  },
  buttons: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5cba7",
    height: 50,
    padding: 5,
    margin: 10,
  },
  filterInputs: {
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  outputText: {
    marginTop: 5,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 20,
  },
  resultsText: {
    fontSize: 18,
    padding: 10,
    backgroundColor: "#e0e0e0",
  },
});
