import { MonthlyReturn } from '../types';

export const parseReturnsCSV = (file: File, itemName: string): Promise<MonthlyReturn[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) {
                return reject(new Error('File is empty.'));
            }

            const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
            if (rows.length < 2) {
                return reject(new Error('CSV must have a header row and at least one data row.'));
            }

            const header = rows[0].split(',').map(h => h.trim());
            const lowerCaseHeader = header.map(h => h.toLowerCase());
            const dateIndex = lowerCaseHeader.indexOf('date');
            const valueIndex = lowerCaseHeader.indexOf(itemName.toLowerCase());

            if (dateIndex === -1) {
                return reject(new Error("CSV header must contain a 'date' column."));
            }
            
            if (valueIndex === -1) {
                return reject(new Error(`CSV header must contain a column named '${itemName}'. The current headers are: ${header.join(', ')}`));
            }

            const returns: MonthlyReturn[] = [];
            
            for (let i = 1; i < rows.length; i++) {
                const cells = rows[i].split(',');
                const dateStr = cells[dateIndex]?.trim();
                const value = parseFloat(cells[valueIndex]);

                if (!/^\d{2}\/01\/\d{4}$/.test(dateStr)) {
                    return reject(new Error(`Invalid date format in row ${i + 1}. Expected mm/01/yyyy.`));
                }
                
                if (isNaN(value)) {
                    return reject(new Error(`Invalid value in row ${i + 1}. Must be a number.`));
                }

                const [month, day, year] = dateStr.split('/');
                const formattedDate = `${year}-${month}`;
                returns.push({ date: formattedDate, value });
            }

            // Sort by date to ensure proper calculations
            returns.sort((a, b) => a.date.localeCompare(b.date));
            resolve(returns);
        };

        reader.onerror = () => {
            reject(new Error('Failed to read the file.'));
        };

        reader.readAsText(file);
    });
};
