import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

type CountryType = {
    name: string;
    callingCode: string;
    flag: string;
};

export default function CountryPickerModal({
    visible,
    onClose,
    onSelect,
}: {
    visible: boolean;
    onClose: () => void;
    onSelect: (country: CountryType) => void;
}) {
    const [countries, setCountries] = useState<CountryType[]>([]);
    const [filtered, setFiltered] = useState<CountryType[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("https://restcountries.com/v2/all?fields=name,callingCodes,flags")
            .then((res) => res.json())
            .then((data) => {
                const mapped = data?.map((item: any) => ({
                    name: item.name,
                    callingCode: item?.callingCodes?.[0] || "",
                    flag: item.flags?.png || "",
                })).filter((item: CountryType) => item.callingCode !== "");
                setCountries(mapped.sort((a: any, b: any) => a.name.localeCompare(b.name)));
                setFiltered(mapped);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handleSearch = (text: string) => {
        setSearch(text);
        const filteredList = countries.filter((c) =>
            c.name.toLowerCase().includes(text.toLowerCase())
        );
        setFiltered(filteredList);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalBackground}>
                <View style={styles.modalContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search country"
                        value={search}
                        onChangeText={handleSearch}
                    />
                    {loading ? (
                        <ActivityIndicator size="large" color="#000" />
                    ) : (
                        <FlatList
                            data={filtered}
                            keyExtractor={(item) => item.name}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.countryItem}
                                    onPress={() => {
                                        onSelect(item);
                                        onClose();
                                    }}
                                >
                                    <Image source={{ uri: item.flag }} style={styles.flag} />
                                    <Text style={styles.countryText}>
                                        {item.name} (+{item.callingCode})
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
            
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
    },
    modalContainer: {
        backgroundColor: "#fff",
        margin: 20,
        borderRadius: 10,
        padding: 20,
        maxHeight: "80%",
    },
    searchInput: {
        borderWidth: 1,
        borderColor: "#ddd",
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    countryItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
    },
    flag: {
        width: 32,
        height: 20,
        marginRight: 10,
    },
    countryText: {
        fontSize: 16,
    },
    closeButton: {
        alignItems: "center",
        marginTop: 10,
    },
    closeText: {
        color: "blue",
        fontWeight: "bold",
    },
});
