import requests
import re

url = "https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/"
print(f"Fetching directory listing from {url}...")

try:
    response = requests.get(url)
    response.raise_for_status()
    content = response.text
    
    # Find all detail files
    # Pattern: StormEvents_details-ftp_v1.0_dYYYY_cYYYYMMDD.csv.gz
    pattern = r'StormEvents_details-ftp_v1\.0_d(\d{4})_c(\d{8})\.csv\.gz'
    matches = re.findall(pattern, content)
    
    print(f"Found {len(matches)} matches.")
    
    # Organize by year, keep latest creation date
    files_by_year = {}
    for year, date in matches:
        if year not in files_by_year or date > files_by_year[year]:
            files_by_year[year] = date
            
    # Print latest for 2015-2023
    for year in range(2015, 2024):
        y_str = str(year)
        if y_str in files_by_year:
            print(f"Year {year}: c{files_by_year[y_str]}")
        else:
            print(f"Year {year}: Not found")
            
except Exception as e:
    print(f"Error: {e}")

