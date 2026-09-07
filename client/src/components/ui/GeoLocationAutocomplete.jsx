import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { cn } from '../../utils/cn';

const INDIAN_CITIES = [
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
  { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { name: 'Thane', state: 'Maharashtra', lat: 19.2183, lng: 72.9781 },
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
  { name: 'Pimpri-Chinchwad', state: 'Maharashtra', lat: 18.6298, lng: 73.7997 },
  { name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { name: 'Vadodara', state: 'Gujarat', lat: 22.3072, lng: 73.1812 },
  { name: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6692, lng: 77.4538 },
  { name: 'Ludhiana', state: 'Punjab', lat: 30.9010, lng: 75.8573 },
  { name: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081 },
  { name: 'Nashik', state: 'Maharashtra', lat: 19.9975, lng: 73.7898 },
  { name: 'Faridabad', state: 'Haryana', lat: 28.4089, lng: 77.3178 },
  { name: 'Meerut', state: 'Uttar Pradesh', lat: 28.9845, lng: 77.7064 },
  { name: 'Rajkot', state: 'Gujarat', lat: 22.3039, lng: 70.8022 },
  { name: 'Kalyan-Dombivli', state: 'Maharashtra', lat: 19.2437, lng: 73.1355 },
  { name: 'Vasai-Virar', state: 'Maharashtra', lat: 19.4912, lng: 72.8054 },
  { name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
  { name: 'Srinagar', state: 'Jammu & Kashmir', lat: 34.0837, lng: 74.7973 },
  { name: 'Aurangabad', state: 'Maharashtra', lat: 19.8762, lng: 75.3433 },
  { name: 'Dhanbad', state: 'Jharkhand', lat: 23.7957, lng: 86.4304 },
  { name: 'Amritsar', state: 'Punjab', lat: 31.6340, lng: 74.8723 },
  { name: 'Navi Mumbai', state: 'Maharashtra', lat: 19.0330, lng: 73.0297 },
  { name: 'Allahabad', state: 'Uttar Pradesh', lat: 25.4358, lng: 81.8463 },
  { name: 'Howrah', state: 'West Bengal', lat: 22.5958, lng: 88.2636 },
  { name: 'Ranchi', state: 'Jharkhand', lat: 23.3441, lng: 85.3096 },
  { name: 'Gwalior', state: 'Madhya Pradesh', lat: 26.2183, lng: 78.1828 },
  { name: 'Jabalpur', state: 'Madhya Pradesh', lat: 23.1815, lng: 79.9864 },
  { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558 },
  { name: 'Vijayawada', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.6480 },
  { name: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lng: 73.0243 },
  { name: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198 },
  { name: 'Raipur', state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296 },
  { name: 'Kota', state: 'Rajasthan', lat: 25.2138, lng: 75.8648 },
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 },
  { name: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
  { name: 'Solapur', state: 'Maharashtra', lat: 17.6599, lng: 75.9064 },
  { name: 'Hubli-Dharwad', state: 'Karnataka', lat: 15.3647, lng: 75.1240 },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu', lat: 10.7905, lng: 78.7047 },
  { name: 'Bareilly', state: 'Uttar Pradesh', lat: 28.3670, lng: 79.4304 },
  { name: 'Mysore', state: 'Karnataka', lat: 12.2958, lng: 76.6394 },
  { name: 'Tiruppur', state: 'Tamil Nadu', lat: 11.1085, lng: 77.3411 },
  { name: 'Gurgaon', state: 'Haryana', lat: 28.4595, lng: 77.0266 },
  { name: 'Aligarh', state: 'Uttar Pradesh', lat: 27.8974, lng: 78.0880 },
  { name: 'Jalandhar', state: 'Punjab', lat: 31.3260, lng: 75.5762 },
  { name: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245 },
  { name: 'Salem', state: 'Tamil Nadu', lat: 11.6643, lng: 78.1460 },
  { name: 'Warangal', state: 'Telangana', lat: 17.9784, lng: 79.5941 },
  { name: 'Guntur', state: 'Andhra Pradesh', lat: 16.3067, lng: 80.4365 },
  { name: 'Bhiwandi', state: 'Maharashtra', lat: 19.2813, lng: 73.0483 },
  { name: 'Saharanpur', state: 'Uttar Pradesh', lat: 29.9680, lng: 77.5552 },
  { name: 'Gorakhpur', state: 'Uttar Pradesh', lat: 26.7606, lng: 83.3732 },
  { name: 'Bikaner', state: 'Rajasthan', lat: 28.0229, lng: 73.3119 },
  { name: 'Amravati', state: 'Maharashtra', lat: 20.9374, lng: 77.7796 },
  { name: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.3910 },
  { name: 'Jamshedpur', state: 'Jharkhand', lat: 22.8046, lng: 86.2029 },
  { name: 'Bhilai', state: 'Chhattisgarh', lat: 21.1938, lng: 81.3509 },
  { name: 'Cuttack', state: 'Odisha', lat: 20.4625, lng: 85.8828 },
  { name: 'Firozabad', state: 'Uttar Pradesh', lat: 27.1592, lng: 78.3957 },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673 },
  { name: 'Nellore', state: 'Andhra Pradesh', lat: 14.4426, lng: 79.9865 },
  { name: 'Bhavnagar', state: 'Gujarat', lat: 21.7645, lng: 72.1519 },
  { name: 'Dehradun', state: 'Uttarakhand', lat: 30.3165, lng: 78.0322 },
  { name: 'Durgapur', state: 'West Bengal', lat: 23.5204, lng: 87.3119 },
  { name: 'Asansol', state: 'West Bengal', lat: 23.6739, lng: 86.9524 },
  { name: 'Rourkela', state: 'Odisha', lat: 22.2604, lng: 84.8536 },
  { name: 'Nanded', state: 'Maharashtra', lat: 19.1383, lng: 77.3210 },
  { name: 'Kolhapur', state: 'Maharashtra', lat: 16.7050, lng: 74.2433 },
  { name: 'Ajmer', state: 'Rajasthan', lat: 26.4499, lng: 74.6399 },
  { name: 'Akola', state: 'Maharashtra', lat: 20.7002, lng: 77.0082 },
  { name: 'Gulbarga', state: 'Karnataka', lat: 17.3297, lng: 76.8343 },
  { name: 'Jamnagar', state: 'Gujarat', lat: 22.4707, lng: 70.0577 },
  { name: 'Ujjain', state: 'Madhya Pradesh', lat: 23.1765, lng: 75.7885 },
  { name: 'Loni', state: 'Uttar Pradesh', lat: 28.7500, lng: 77.2880 },
  { name: 'Siliguri', state: 'West Bengal', lat: 26.7271, lng: 88.3953 },
  { name: 'Jhansi', state: 'Uttar Pradesh', lat: 25.4484, lng: 78.5685 },
  { name: 'Ulhasnagar', state: 'Maharashtra', lat: 19.2215, lng: 73.1645 },
  { name: 'Jammu', state: 'Jammu & Kashmir', lat: 32.7266, lng: 74.8570 },
  { name: 'Sangli-Miraj', state: 'Maharashtra', lat: 16.8524, lng: 74.5815 },
  { name: 'Mangalore', state: 'Karnataka', lat: 12.9141, lng: 74.8560 },
  { name: 'Erode', state: 'Tamil Nadu', lat: 11.3410, lng: 77.7172 },
  { name: 'Belgaum', state: 'Karnataka', lat: 15.8497, lng: 74.4977 },
  { name: 'Ambattur', state: 'Tamil Nadu', lat: 13.1143, lng: 80.1548 },
  { name: 'Tirunelveli', state: 'Tamil Nadu', lat: 8.7139, lng: 77.7567 },
  { name: 'Malegaon', state: 'Maharashtra', lat: 20.5579, lng: 74.5287 },
  { name: 'Gaya', state: 'Bihar', lat: 24.7914, lng: 84.9993 },
  { name: 'Jalgaon', state: 'Maharashtra', lat: 21.0077, lng: 75.5626 },
  { name: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125 },
  { name: 'Maheshtala', state: 'West Bengal', lat: 22.5064, lng: 88.2482 },
];

export function GeoLocationAutocomplete({
  value,
  onChange,
  label = 'City',
  placeholder = 'Start typing your city...',
  className,
  required = false,
  helperText,
  error,
  disabled = false,
  ...props
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = INDIAN_CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(value.toLowerCase()) ||
        city.state.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 8);

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(-1);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city) => {
    onChange(city.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const handleFocus = () => {
    setFocused(true);
    if (value.length >= 2) setShowSuggestions(true);
  };

  const handleBlur = () => {
    setFocused(false);
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className={cn('relative', className)}>
      <label className="block text-sm font-medium text-zinc-700 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="address-level2"
            inputMode="text"
            className={cn(
              'w-full px-4 py-3 rounded-xl border text-base transition-all duration-200 bg-zinc-50',
              'focus:outline-none focus:ring-2 focus:ring-primary-900/20 focus:border-primary-900',
              'placeholder:text-zinc-400 text-primary-900',
              'pr-12',
              error
                ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                : 'border-zinc-200',
              focused && !error ? 'border-primary-900/50' : '',
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            )}
            {...props}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <MapPin className="h-5 w-5 text-zinc-400" />
            {value && !disabled && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onChange(''); inputRef.current?.focus(); }}
                className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                aria-label="Clear city"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <ul
            ref={listRef}
            className="absolute z-50 w-full mt-1.5 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden animate-slide-down"
            role="listbox"
          >
            {suggestions.map((city, index) => (
              <li
                key={`${city.name}-${city.state}`}
                onClick={() => handleSelect(city)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'px-4 py-3 cursor-pointer transition-colors flex items-center gap-3',
                  index === selectedIndex
                    ? 'bg-primary-50 text-primary-900'
                    : 'text-zinc-700 hover:bg-zinc-50'
                )}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <MapPin className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{city.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{city.state}</p>
                </div>
                {index === selectedIndex && (
                  <svg className="h-5 w-5 text-primary-900" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </li>
            ))}
          </ul>
        )}

        {showSuggestions && suggestions.length === 0 && value.length >= 2 && (
          <ul className="absolute z-50 w-full mt-1.5 rounded-xl border border-zinc-200 bg-white shadow-lg">
            <li className="px-4 py-3 text-center text-zinc-500 text-sm">
              No matching cities found. Type manually or check spelling.
            </li>
          </ul>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-zinc-500">{helperText}</p>}
    </div>
  );
}

export default GeoLocationAutocomplete;