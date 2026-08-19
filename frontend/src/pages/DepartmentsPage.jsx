import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/PageHeader';

import {
  departmentService,
  employeeService
} from '../services/services';

import {
  Building2,
  Plus,
  Users,
  Trash2,
  RefreshCw
} from 'lucide-react';

import './DepartmentsPage.css';


export default function DepartmentsPage({ user }) {

  // ============================================================
  // DATA
  // ============================================================

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');


  // ============================================================
  // CREATE DEPARTMENT MODAL
  // ============================================================

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');


  // ============================================================
  // LOAD DEPARTMENTS + EMPLOYEES
  // ============================================================

  const fetchDepartments = useCallback(async (isRefresh = false) => {

    try {

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      // Load both at the same time
      const [departmentData, employeeData] = await Promise.all([
        departmentService.getAll(),
        employeeService.getAll()
      ]);

      const safeDepartments = Array.isArray(departmentData)
        ? departmentData
        : [];

      const safeEmployees = Array.isArray(employeeData)
        ? employeeData
        : [];


      // ----------------------------------------------------------
      // Store employees
      // ----------------------------------------------------------

      setEmployees(safeEmployees);


      // ----------------------------------------------------------
      // Calculate employee count for every department
      // ----------------------------------------------------------

      const departmentsWithCounts = safeDepartments.map((dept) => {

        const departmentEmployees = safeEmployees.filter((employee) => {

          // Employee department ID
          const employeeDepartmentId =
            employee.department_id ??
            employee.department?.id ??
            employee.departmentId;

          if (
            employeeDepartmentId === null ||
            employeeDepartmentId === undefined
          ) {
            return false;
          }

          return String(employeeDepartmentId) === String(dept.id);
        });


        return {
          ...dept,

          // Always calculate from real employee data
          employee_count: departmentEmployees.length,

          // Keep employee list available for future use
          employees: departmentEmployees
        };
      });


      setDepartments(departmentsWithCounts);

    } catch (err) {

      console.error(
        'Department/Employee API Error:',
        err
      );

      setDepartments([]);
      setEmployees([]);

      setError(
        err.response?.data?.detail ||
        err.message ||
        'Failed to load departments and employees.'
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  }, []);


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {

    fetchDepartments();

  }, [fetchDepartments]);


  // ============================================================
  // AUTO REFRESH
  // ============================================================
  // Keeps department employee counts updated if an employee is
  // added/removed from another page.
  // ============================================================

  useEffect(() => {

    const interval = setInterval(() => {

      fetchDepartments(true);

    }, 10000); // every 10 seconds

    return () => clearInterval(interval);

  }, [fetchDepartments]);


  // ============================================================
  // CREATE DEPARTMENT
  // ============================================================

  const handleCreate = async (e) => {

    e.preventDefault();

    try {

      setError('');

      if (!name.trim()) {

        alert('Please enter department name.');

        return;
      }


      const departmentData = {
        name: name.trim(),
        description: description.trim(),
        is_active: true
      };


      await departmentService.create(
        departmentData
      );


      // Reset modal
      setShowModal(false);
      setName('');
      setDescription('');


      // Reload departments + employees
      await fetchDepartments();


      alert('Department created successfully!');

    } catch (err) {

      console.error(
        'CREATE DEPARTMENT ERROR:',
        err
      );

      const message =
        err.response?.data?.detail ||
        err.message ||
        'Failed to create department.';

      alert(
        'Error creating department: ' +
        message
      );

    }

  };


  // ============================================================
  // DELETE DEPARTMENT
  // ============================================================

  const handleDelete = async (id) => {

    // Check whether department has employees
    const departmentEmployeeCount =
      employees.filter((employee) => {

        const employeeDepartmentId =
          employee.department_id ??
          employee.department?.id ??
          employee.departmentId;

        return (
          employeeDepartmentId !== null &&
          employeeDepartmentId !== undefined &&
          String(employeeDepartmentId) === String(id)
        );

      }).length;


    if (departmentEmployeeCount > 0) {

      const confirmed = window.confirm(
        `This department has ${departmentEmployeeCount} employee(s).\n\n` +
        `Are you sure you want to delete it?`
      );

      if (!confirmed) {
        return;
      }

    } else {

      if (
        !window.confirm(
          'Are you sure you want to delete this department?'
        )
      ) {
        return;
      }

    }


    try {

      await departmentService.delete(id);

      await fetchDepartments();

    } catch (err) {

      console.error(
        'DELETE DEPARTMENT ERROR:',
        err
      );

      alert(
        err.response?.data?.detail ||
        'Failed to delete department.'
      );

    }

  };


  // ============================================================
  // MANUAL REFRESH
  // ============================================================

  const handleRefresh = async () => {

    await fetchDepartments(true);

  };


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div className="departments-page-container">

      <PageHeader
        title="Department Management"
        subtitle="Organize operational teams, manager assignments, and workforce units"
        user={user}
      />


      <div className="departments-content">


        {/* ======================================================
            ACTION BAR
        ====================================================== */}

        <div className="departments-action-bar ai-card">

          <div>

            <h3 className="ai-card-title">
              All Departments
            </h3>

            <p className="ai-card-subtitle">
              Active workforce teams & count
            </p>

          </div>


          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}
          >

            {/* Refresh */}

            <button
              onClick={handleRefresh}
              className="btn btn-secondary"
              disabled={refreshing}
              title="Refresh employee counts"
            >

              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? 'spin'
                    : ''
                }
              />

              <span>
                Refresh
              </span>

            </button>


            {/* Add Department */}

            <button
              onClick={() => {

                setName('');
                setDescription('');
                setShowModal(true);

              }}
              className="btn btn-primary"
            >

              <Plus size={16} />

              <span>
                Add Department
              </span>

            </button>

          </div>

        </div>


        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (

          <div className="dashboard-alert-banner">

            <strong>
              Department API Error:
            </strong>

            {' '}

            {error}

          </div>

        )}


        {/* ======================================================
            LOADING
        ====================================================== */}

        {loading ? (

          <div className="ai-card p-20">

            <div
              className="skeleton"
              style={{
                height: 240
              }}
            />

          </div>

        ) : departments.length === 0 ? (

          /* ====================================================
             EMPTY
          ==================================================== */

          <div className="ai-card empty-dept-state">

            <Building2
              size={40}
              color="#94a3b8"
            />

            <h4>
              No departments created yet
            </h4>

            <p>
              Create departments to group your workforce members.
            </p>

          </div>

        ) : (

          /* ====================================================
             DEPARTMENT CARDS
          ==================================================== */

          <div className="departments-grid-cards">

            {departments.map((dept) => (

              <div
                key={dept.id}
                className="dept-card ai-card"
              >


                {/* ==================================================
                    CARD TOP
                ================================================== */}

                <div className="dept-card-top">

                  <div className="dept-icon-wrapper">

                    <Building2
                      size={22}
                      color="#2563eb"
                    />

                  </div>


                  <button
                    className="icon-btn delete-dept-btn"
                    onClick={() =>
                      handleDelete(dept.id)
                    }
                    title="Delete Department"
                  >

                    <Trash2 size={15} />

                  </button>

                </div>


                {/* ==================================================
                    CARD BODY
                ================================================== */}

                <div className="dept-card-body">

                  <h4 className="dept-name">
                    {dept.name}
                  </h4>

                  <p className="dept-desc">
                    {dept.description ||
                      'No description provided.'}
                  </p>

                </div>


                {/* ==================================================
                    CARD FOOTER
                ================================================== */}

                <div className="dept-card-footer">

                  <span className="badge badge-info">

                    <Users size={12} />

                    {dept.employee_count}

                    {' '}

                    {dept.employee_count === 1
                      ? 'Member'
                      : 'Members'}

                  </span>


                  <span
                    className={`badge ${dept.is_active
                        ? 'badge-success'
                        : 'badge-warning'
                      }`}
                  >

                    {dept.is_active
                      ? 'Active'
                      : 'Inactive'}

                  </span>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>


      {/* ========================================================
          CREATE DEPARTMENT MODAL
      ======================================================== */}

      {showModal && (

        <div className="modal-backdrop">

          <div className="modal-card ai-card">


            {/* HEADER */}

            <div className="modal-header">

              <h3 className="modal-title">
                Create Department
              </h3>

              <button
                onClick={() =>
                  setShowModal(false)
                }
                className="close-btn"
              >

                &times;

              </button>

            </div>


            {/* FORM */}

            <form
              onSubmit={handleCreate}
              className="modal-form"
            >


              {/* NAME */}

              <div className="input-group">

                <label>
                  Department Name *
                </label>

                <input
                  type="text"
                  className="input-field"
                  placeholder="Engineering, HR, Marketing..."
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                />

              </div>


              {/* DESCRIPTION */}

              <div className="input-group">

                <label>
                  Description
                </label>

                <textarea
                  className="input-field"
                  rows="3"
                  placeholder="Brief description of department scope..."
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                />

              </div>


              {/* FOOTER */}

              <div className="modal-footer">

                <button
                  type="button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  className="btn btn-secondary"
                >

                  Cancel

                </button>


                <button
                  type="submit"
                  className="btn btn-primary"
                >

                  <Plus size={16} />

                  Save Department

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );

}