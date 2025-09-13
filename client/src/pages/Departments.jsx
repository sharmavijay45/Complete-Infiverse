import { useState } from "react";
import { DepartmentList } from "../components/departments/department-list";
import { DepartmentHeader } from "../components/departments/department-header";
import { DepartmentDetails } from "../components/departments/DepartmentDetails";

function Departments() {
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const handleDepartmentSelect = (department) => {
    setSelectedDepartment(department);
  };

  const handleBackToDepartments = () => {
    setSelectedDepartment(null);
  };

  if (selectedDepartment) {
    return (
      <DepartmentDetails 
        department={selectedDepartment} 
        onBack={handleBackToDepartments} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <DepartmentHeader />
      <DepartmentList onDepartmentSelect={handleDepartmentSelect} />
    </div>
  );
}

export default Departments;
