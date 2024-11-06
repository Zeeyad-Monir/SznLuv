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

  async function checkIfSznLuvExists(sznluvName, sznluvLocation) {
    const sznluvRef = collection(db, "sznluv");

    const q = query(
      sznluvRef,
      and(
        where("name", "==", sznluvName),
        where("location", "==", sznluvLocation)
      )
    );

    const querySnapshot = await getDocs(q);
    console.log(sznluvName);

    if (querySnapshot.empty) {
      console.log(
        `No item with the name ${name} exists in the ${location} location.`
      );
      return false;
    } else {
      console.log("Item with that name already exists in that location.");
      return true;
    }
  }

  async function insertNewSznLuv() {
    if (await checkIfSznLuvExists(name, location)) {
      console.log(`Item ${name} already exists in the ${location} location.`);
      clearFields;
    } else {
      console.log(
        `Item ${name} does not exist yet in the ${location} location - adding item ${name}`
      );
      try {
        const docRef = doc(collection(db, "sznluv"));
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
          `Item "${name}" in "${location}" location inserted into db.`
        );
      } catch (e) {
        console.error("Error adding document: ", e);
      }
    }
  }

  async function getSznLuv() {
    const querySnapshot = await getDocs(collection(db, "sznluv"));
    let allSznLuvItems = [];
    querySnapshot.forEach((doc) => {
      console.log(doc.id, "=>", doc.data());
      allSznLuvItems.push(
        `${JSON.stringify(doc.data().name)} // ${JSON.stringify(
          doc.data().type
        )} // ${JSON.stringify(doc.data().location)}`
      );
    });
    setResults(allSznLuvItems.join("\n"));
  }

  async function filterSznLuv() {
    let whereArr = [];
    let filteredSznLuv = [];

    if (filterName) {
      whereArr = [where("name", "==", filterName)];
    }

    if (filterType) {
      whereArr = [...whereArr, where("type", "==", filterType)];
    }

    if (filterLocation) {
      whereArr = [...whereArr, where("location", "==", filterLocation)];
    }

    const q = query(collection(db, "sznluv"), ...whereArr);
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("No matching items found.");
    } else {
      querySnapshot.forEach((doc) => {
        console.log(doc.id, "=>", doc.data());
        filteredSznLuv.push(
          `${JSON.stringify(doc.data().name)} in ${JSON.stringify(
            doc.data().location
          )}`
        );
      });
      setResults(filteredSznLuv.join("\n"));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titleText}>SznLuv Items</Text>

      <TouchableOpacity onPress={insertNewSznLuv} style={styles.buttons}>
        <Text>Add Item</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        onChangeText={setName}
        value={name}
        placeholder="Enter item name"
      />

      <TextInput
        style={styles.input}
        onChangeText={setType}
        value={type}
        placeholder="Enter item type"
      />

      <TextInput
        style={styles.input}
        onChangeText={setLocation}
        value={location}
        placeholder="Enter item location"
      />

      <TouchableOpacity onPress={getSznLuv} style={styles.buttons}>
        <Text>Show ALL Items</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={filterSznLuv} style={styles.buttons}>
        <Text>Filter Items</Text>
      </TouchableOpacity>

      <View style={styles.filterInputs}>
        <TextInput
          style={styles.input}
          onChangeText={setFilterName}
          value={filterName}
          placeholder="Enter item name"
        />

        <TextInput
          style={styles.input}
          onChangeText={setFilterType}
          value={filterType}
          placeholder="Enter item type"
        />

        <TextInput
          style={styles.input}
          onChangeText={setFilterLocation}
          value={filterLocation}
          placeholder="Enter item location"
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
    marginBottom: 10,
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