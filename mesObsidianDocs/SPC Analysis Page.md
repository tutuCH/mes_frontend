redo spc analysis page
	-  instead of showing Latest SPC Metrics, i want the best suited table for each metrics and showing the historic relationship
	- using Melt Temperature as a good example, i want all metric metircs display in this way. 
	- update the export report button to make it actually able to generate a xlsx report containing all historic data


update # Factory Overview
1. you are a frontend designer, create add/delete factory button that allows user to add/delete factory.
2.  you are a frontend designer. given the sample data from /factory-machines. add a button so i can edit the factory floor map, size is factoryWidth * factoryHeight.
```
{
    "factoryId": 1,
    "factoryName": "postgres factory 1",
    "factoryWidth": 5,
    "factoryHeight": 3,
    "machines": [
        {
            "machineId": 1,
            "machineName": "postgres machine 1",
            "machineIpAddress": "192.168.5.1",
            "machineIndex": 0
        }
    ]
}
```
3. you are a data science. make a plan to aggregate factory machine spc data and data visualization

Here is the optimized version of your prompt in English. I have structured it to be more professional, specific, and technically clear to ensure the AI provides high-quality, production-ready results.

---

## Task: Update Factory Overview Page

### Role 1: Senior Frontend Engineer (UI/UX)

**Task: Factory Management & Interactive Floor Map**

1. **Factory CRUD Operations**: Create a clean, intuitive UI for "Adding" and "Deleting" factories. Ensure the code is concise and reader-friendly. Include state management logic and a confirmation step for deletions to prevent accidental data loss.
    
2. **Interactive Floor Map Editor**: Using the provided sample data from `/factory-machines`, implement a "Edit Floor Map" feature:
    
    - **Grid Rendering**: Generate a visual grid based on `factoryWidth` and `factoryHeight` (e.g., $5 \times 3$).
        
    - **Machine Placement**: Map the `machines` array to the grid. Use `machineIndex` to determine the specific coordinate/cell for each machine.
        
    - **UI Requirements**: Provide a toggle or button to enter "Edit Mode" where machines can be repositioned or assigned to new grid coordinates.
        

---

### Role 2: Data Scientist

**Task: SPC Data Aggregation & Visualization Strategy**

Develop a comprehensive plan to monitor and analyze Statistical Process Control (SPC) data from factory machines. The plan should cover:

1. **Data Aggregation Pipeline**:
    
    - Define a strategy to poll or stream data from specific `machineIpAddress` endpoints.
        
    - Outline the aggregation of raw sensor data into statistical markers (Mean $\bar{x}$, Range $R$, and Standard Deviation $\sigma$).
        
2. **Visualization & Monitoring**:
    
    - **Control Charts**: Design a schema for X-bar and R-charts, including Calculated Center Lines ($CL$), Upper Control Limits ($UCL$), and Lower Control Limits ($LCL$).
        
    - **Dashboarding**: Suggest the most effective chart types for identifying trends, shifts, and cycles in machine performance.
        
3. **Anomaly Detection**: Integrate standard SPC rules (e.g., Western Electric or Nelson rules) to trigger automated alerts when a process goes out of control.
    

---

## Why this is better:

- **Logical Hierarchy**: It separates the "how-to-build" (Frontend) from the "what-to-analyze" (Data Science).
    
- **Technical Specificity**: It explicitly mentions grid rendering logic and specific SPC statistical formulas ($UCL$/$LCL$), which prevents the AI from giving generic or shallow answers.
    
- **User Intent**: It focuses on the relationship between the JSON data (`machineIndex`) and the visual output.
    

**Would you like me to generate the React/Vue code for the floor map or provide a Python template for the SPC data aggregation?**