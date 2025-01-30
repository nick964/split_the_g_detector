import { useState, useEffect } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";

export default function BarSearch({ onBarSelect }) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types: ['bar', 'restaurant'],
      componentRestrictions: { country: 'us' },
    },
    debounce: 300,
  });

  const handleInput = (e) => {
    setValue(e.target.value);
  };

  const handleSelect = async (suggestion) => {
    setValue(suggestion.description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address: suggestion.description });
      const { lat, lng } = await getLatLng(results[0]);
      onBarSelect({
        name: suggestion.structured_formatting.main_text,
        address: suggestion.description,
        placeId: suggestion.place_id,
        location: { lat, lng },
      });
    } catch (error) {
      console.error("Error selecting location:", error);
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        <Input
          value={value}
          onChange={handleInput}
          disabled={!ready}
          placeholder="Search for a bar..."
          className="pl-10"
        />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
      </div>
      
      {status === "OK" && (
        <ul className="mt-2 max-h-60 overflow-auto rounded-md border bg-white shadow-lg">
          {data.map((suggestion) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion;

            return (
              <li
                key={place_id}
                onClick={() => handleSelect(suggestion)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <div className="font-medium">{main_text}</div>
                  <div className="text-sm text-gray-500">{secondary_text}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}