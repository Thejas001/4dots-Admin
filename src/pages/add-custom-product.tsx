import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/axios';
import toast, { Toaster } from 'react-hot-toast';
import { USER_LIST, USER_CREATE } from '@/config/api';
import { User, CreateUserRequest } from '@/types/user';

interface CustomProduct {
  UserId: string;
  ProductName: string;
  Description: string;
  BasePrice: number;
  Quantity: number;
  DocumentIds: number[];
}

interface DocumentUploadResponse {
  Success: boolean;
  Data: {
    Id: number;
    DocumentUrl: string;
    Status: string;
    PageCount: number | null;
  };
  Message: string;
  Errors: any;
  Messages: any;
}

const AddCustomProduct: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<CustomProduct>({
    UserId: '',
    ProductName: '',
    Description: '',
    BasePrice: '' as any,
    Quantity: 1,
    DocumentIds: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  
  // User list state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userPageSize] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Add user form state
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserRequest>({
    PhoneNumber: '',
    FirstName: '',
    MiddleName: '',
    LastName: '',
    Email: '',
    IsActive: true
  });

  // Fetch users from API
  const fetchUsers = async (page: number = 1, search: string = '') => {
    setLoadingUsers(true);
    try {
      let url = `/api/user/admin/list?pageNumber=${page}&pageSize=10`;
      if (search.trim()) {
        const searchValue = search.trim();
        // Check if search is email (contains @) or phone number (digits with optional + at start)
        const isEmail = searchValue.includes('@');
        const isPhone = /^\+?\d+$/.test(searchValue);
        
        if (isEmail) {
          url += `&email=${encodeURIComponent(searchValue)}`;
        } else if (isPhone) {
          url += `&phoneNumber=${encodeURIComponent(searchValue)}`;
        } else {
          // If neither, try email parameter (could be partial email)
          url += `&email=${encodeURIComponent(searchValue)}`;
        }
      }
      console.log('Fetching users from:', url);
  
      const response = await api.get(url);
      console.log('API Response:', response.data);
  
      // The API returns data in { Items: [...], TotalCount: 5, ... } format
      const userData = (response.data as any)?.Items || [];
      setUsers(Array.isArray(userData) ? userData : []);
      setTotalUsers((response.data as any)?.TotalCount || 0);
      setTotalPages((response.data as any)?.TotalPages || 0);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setTotalUsers(0);
      toast.error(`Failed to fetch users: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    } finally {
      setLoadingUsers(false);
    }
  };
  

  // Copy user ID to clipboard
  const copyUserId = async (userId: string) => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopiedUserId(userId);
      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedUserId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy user ID:', error);
    }
  };

  // Select user and auto-fill user ID
  const selectUser = (user: User) => {
    setSelectedUser(user);
    setFormData(prev => ({
      ...prev,
      UserId: user.Id
    }));
    toast.success(`Selected user: ${user.UserName}`);
  };

  // Create new user
  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that either phone number or email is provided
    if (!newUser.PhoneNumber && !newUser.Email) {
      toast.error('Please provide either a phone number or email address.');
      return;
    }
    
    // Additional validation
    if (!newUser.FirstName.trim()) {
      toast.error('First name is required.');
      return;
    }
    
    if (!newUser.LastName.trim()) {
      toast.error('Last name is required.');
      return;
    }
    
    setIsCreatingUser(true);
    
    try {
      console.log('Creating user with data:', newUser);
      const response = await api.post(USER_CREATE, newUser);
      console.log('User creation response:', response.data);
      toast.success('User created successfully!');
      closeUserForm();
      // Refresh the user list
      fetchUsers(userPage, searchQuery);
    } catch (error: any) {
      console.error('Error creating user:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle different types of errors
      let errorMessage = 'Failed to create user';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle the specific API response format: {"Success":false,"Errors":["User with this phone number already exists"]}
        if (errorData.Errors && Array.isArray(errorData.Errors)) {
          errorMessage = errorData.Errors.join(', ');
        }
        // Handle validation errors
        else if (errorData.errors && typeof errorData.errors === 'object') {
          const validationErrors = Object.values(errorData.errors).flat();
          errorMessage = `Validation errors: ${validationErrors.join(', ')}`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.Message) {
          errorMessage = errorData.Message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Handle new user form input changes
  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Clear and close user form
  const closeUserForm = () => {
    setShowAddUserForm(false);
    // Reset form to initial state
    setNewUser({
      PhoneNumber: '',
      FirstName: '',
      MiddleName: '',
      LastName: '',
      Email: '',
      IsActive: true
    });
  };

  // Search handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUserPage(1);
    fetchUsers(1, searchQuery);
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setUserPage(newPage);
    fetchUsers(newPage, searchQuery);
  };

  // Load users on component mount
  useEffect(() => {
    fetchUsers(userPage, searchQuery);
  }, [userPage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'BasePrice' || name === 'Quantity' ? Number(value) : value
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate file types
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.psd'];
    const validFiles = fileArray.filter(file => {
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const isValid = allowedExtensions.includes(fileExt);
      if (!isValid) {
        toast.error(`File "${file.name}" has unsupported file type. Allowed: ${allowedExtensions.join(', ')}`);
      }
      return isValid;
    });

    if (validFiles.length === 0) return;

    setUploadingFiles(true);

    try {
      // Upload each file and get document IDs
      const uploadPromises = validFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('document', file);

        try {
          const response = await api.post<DocumentUploadResponse>(
            '/api/document/upload',
            formData,
            {
              headers: { 'Content-Type': 'multipart/form-data' },
            }
          );

          console.log('Upload response for', file.name, ':', response.data);

          // Parse the API response structure
          const documentId = response.data.Data?.Id;
          const documentUrl = response.data.Data?.DocumentUrl;

          if (documentId) {
            // Create local preview using FileReader (no API call needed)
            let previewUrl = 'pdf';
            if (file.type.startsWith('image/')) {
              // Create local base64 preview for images
              previewUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
              });
            }

            return {
              file,
              documentId,
              documentUrl: documentUrl || '',
              previewUrl,
              success: true
            };
          }
          
          console.error('Unexpected response format:', response.data);
          throw new Error(`No document ID returned. Response: ${JSON.stringify(response.data)}`);
        } catch (error: any) {
          console.error(`Failed to upload ${file.name}:`, error);
          const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
          toast.error(`Failed to upload ${file.name}: ${errorMsg}`);
          return { file, documentId: null, documentUrl: '', previewUrl: '', success: false };
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(r => r.success && r.documentId);

      if (successfulUploads.length > 0) {
        // Add to uploaded files and previews
        setUploadedFiles(prev => [...prev, ...successfulUploads.map(r => r.file)]);
        setUploadPreviews(prev => [...prev, ...successfulUploads.map(r => r.previewUrl)]);
        setDocumentUrls(prev => [...prev, ...successfulUploads.map(r => r.documentUrl)]);
        
        // Add document IDs to form data
        setFormData(prev => ({
          ...prev,
          DocumentIds: [...prev.DocumentIds, ...successfulUploads.map(r => r.documentId!)]
        }));

        toast.success(`Successfully uploaded ${successfulUploads.length} file(s)`);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload error: ${error.message || 'An error occurred during file upload'}`);
    } finally {
      setUploadingFiles(false);
      // Reset the input so the same file can be uploaded again if needed
      event.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadPreviews(prev => prev.filter((_, i) => i !== index));
    setDocumentUrls(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      DocumentIds: prev.DocumentIds.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate UserId is provided
    if (!formData.UserId) {
      toast.error('Please enter a user ID');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const requestBody = {
        UserId: formData.UserId,
        ProductName: formData.ProductName,
        Description: formData.Description,
        BasePrice: formData.BasePrice,
        Quantity: formData.Quantity,
        DocumentIds: formData.DocumentIds
      };
      
      console.log('Custom product request:', requestBody);
      
      // Send to API endpoint
      await api.post('/api/cart/add-custom', requestBody);
      
      // Show success message and redirect
      toast.success('Custom product added to user cart successfully!');
      setTimeout(() => {
        router.push('/orders');
      }, 1000);
    } catch (error: any) {
      console.error('Error adding custom product:', error);
      toast.error(`Error adding custom product: ${error.response?.data?.message || error.message || 'Please try again'}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <ProtectedRoute>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management & Custom Products</h1>
                <p className="mt-2 text-gray-600">
                  Manage users and create custom products
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            </div>
          </div>

          {/* User Management Section */}
          <div className="grid grid-cols-1 gap-8 mb-8">
            {/* User List */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-black">Users</h2>
                    <p className="mt-1 text-gray-600">
                      View and manage users ({totalUsers} total)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddUserForm(true)}
                      className="flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add User
                    </button>
                    <button
                      onClick={() => fetchUsers(userPage, searchQuery)}
                      disabled={loadingUsers}
                      className="flex items-center px-4 py-2 text-black hover:text-gray-700 transition-colors disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <svg className={`w-5 h-5 mr-2 ${loadingUsers ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>
                
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, phone, or email..."
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <button
                    type="submit"
                    disabled={loadingUsers}
                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    Search
                  </button>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setUserPage(1);
                        fetchUsers(1, '');
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-black border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </form>
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-6 w-6 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-600">Loading users...</span>
                  </div>
                </div>
              ) : users.length > 0 ? (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div 
                      key={user.Id} 
                      onClick={() => selectUser(user)}
                      className={`border rounded-lg p-3 transition-all cursor-pointer ${
                        selectedUser?.Id === user.Id
                          ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                          : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {/* Left side - Avatar and Info */}
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm ${
                              selectedUser?.Id === user.Id
                                ? 'bg-gradient-to-br from-blue-600 to-blue-400 border-blue-300'
                                : 'bg-gradient-to-br from-gray-500 to-gray-400 border-gray-300'
                            }`}>
                              <span className="text-white font-bold text-sm">
                                {user.UserName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-black truncate">
                              {user.FirstName || user.UserName} {user.LastName || ''}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {user.PhoneNumber || user.Email || 'No contact'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Right side - Status */}
                        <div className="flex-shrink-0">
                          {selectedUser?.Id === user.Id ? (
                            <div className="flex items-center text-blue-600">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              user.IsActive 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {user.IsActive ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-300">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePageChange(userPage - 1)}
                          disabled={userPage <= 1}
                          className="px-3 py-2 text-sm text-black hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 rounded-md hover:bg-gray-100"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-black">
                          Page {userPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => handlePageChange(userPage + 1)}
                          disabled={userPage >= totalPages}
                          className="px-3 py-2 text-sm text-black hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 rounded-md hover:bg-gray-100"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try refreshing the page or check your connection.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Add User Modal */}
          {showAddUserForm && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={closeUserForm}
            >
              <div 
                className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-black">Create New User</h2>
                  <button
                    onClick={closeUserForm}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6">
                <form onSubmit={createUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="PhoneNumber" className="block text-sm font-medium text-black mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="PhoneNumber"
                        name="PhoneNumber"
                        value={newUser.PhoneNumber}
                        onChange={handleNewUserChange}
                        disabled={!!newUser.Email}
                        pattern="^\+?[1-9]\d{1,14}$"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-black disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="+1234567890"
                      />
                    </div>
                    <div>
                      <label htmlFor="Email" className="block text-sm font-medium text-black mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="Email"
                        name="Email"
                        value={newUser.Email}
                        onChange={handleNewUserChange}
                        disabled={!!newUser.PhoneNumber}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-black disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="user@example.com"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">* Either phone number or email is required</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="FirstName" className="block text-sm font-medium text-black mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="FirstName"
                        name="FirstName"
                        value={newUser.FirstName}
                        onChange={handleNewUserChange}
                        required
                        minLength={1}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-black"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label htmlFor="MiddleName" className="block text-sm font-medium text-black mb-1">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        id="MiddleName"
                        name="MiddleName"
                        value={newUser.MiddleName}
                        onChange={handleNewUserChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-black"
                        placeholder="Michael"
                      />
                    </div>
                    <div>
                      <label htmlFor="LastName" className="block text-sm font-medium text-black mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="LastName"
                        name="LastName"
                        value={newUser.LastName}
                        onChange={handleNewUserChange}
                        required
                        minLength={1}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-black"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="IsActive"
                      name="IsActive"
                      checked={newUser.IsActive}
                      onChange={handleNewUserChange}
                      className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                    />
                    <label htmlFor="IsActive" className="ml-2 block text-sm text-black">
                      Active user
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeUserForm}
                      className="px-4 py-2 text-gray-600 hover:text-black transition-colors border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingUser}
                      className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center border border-black"
                    >
                      {isCreatingUser ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </>
                      ) : (
                        'Create User'
                      )}
                    </button>
                  </div>
                </form>
                </div>
              </div>
            </div>
          )}

          {/* Custom Product Form */}
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-black mb-6">Add Custom Product</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selected User Display */}
              {selectedUser ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-400 rounded-full flex items-center justify-center border-2 border-blue-300 shadow-sm">
                        <span className="text-white font-bold">
                          {selectedUser.UserName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Selected User</p>
                        <p className="text-base font-bold text-black">
                          {selectedUser.FirstName || selectedUser.UserName} {selectedUser.LastName || ''}
                        </p>
                        <p className="text-xs text-gray-600">
                          {selectedUser.PhoneNumber || selectedUser.Email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setFormData(prev => ({ ...prev, UserId: '' }));
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear selection"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">No user selected</p>
                      <p className="text-xs text-yellow-700 mt-1">Please select a user from the list above to continue</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Product Name */}
              <div>
                <label htmlFor="ProductName" className="block text-sm font-medium text-black mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  id="ProductName"
                  name="ProductName"
                  value={formData.ProductName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="Enter product name"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="Description" className="block text-sm font-medium text-black mb-2">
                  Description *
                </label>
                <textarea
                  id="Description"
                  name="Description"
                  value={formData.Description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="Describe your custom product"
                />
              </div>

              {/* Base Price and Quantity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="BasePrice" className="block text-sm font-medium text-black mb-2">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    id="BasePrice"
                    name="BasePrice"
                    value={formData.BasePrice}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="Quantity" className="block text-sm font-medium text-black mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    id="Quantity"
                    name="Quantity"
                    value={formData.Quantity}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all"
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Total Price Display */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Price</p>
                    <p className="text-xs text-gray-500 mt-0.5">Quantity × Base Price</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-700">
                      ₹{((Number(formData.BasePrice) || 0) * formData.Quantity).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {formData.Quantity} × ₹{(Number(formData.BasePrice) || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Upload Documents
                </label>
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="document-upload" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg transition-colors ${uploadingFiles ? 'cursor-not-allowed bg-gray-200' : 'cursor-pointer bg-gray-50 hover:bg-gray-100'}`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploadingFiles ? (
                          <>
                            <svg className="animate-spin h-10 w-10 mb-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mb-2 text-sm text-gray-500 font-semibold">Uploading files...</p>
                          </>
                        ) : (
                          <>
                            <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-gray-500">JPG, JPEG, PNG, PDF, PSD (Max 10MB per file)</p>
                          </>
                        )}
                      </div>
                      <input
                        id="document-upload"
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.pdf,.psd"
                        onChange={handleFileUpload}
                        disabled={uploadingFiles}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Uploaded Files Preview */}
                  {uploadedFiles.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <a
                            href={documentUrls[index] || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block aspect-square border border-gray-300 rounded-lg overflow-hidden bg-gray-100 hover:border-blue-500 transition-colors cursor-pointer"
                            title="Click to view document"
                          >
                            {uploadPreviews[index] === 'pdf' ? (
                              <div className="flex flex-col items-center justify-center p-4 h-full">
                                <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                                <p className="text-xs text-gray-600 mt-2 text-center truncate w-full px-2">{file.name}</p>
                              </div>
                            ) : (
                              <img src={uploadPreviews[index]} alt={file.name} className="w-full h-full object-cover" />
                            )}
                          </a>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <div className="mt-1">
                            <p className="text-xs text-gray-600 truncate" title={file.name}>{file.name}</p>
                            <p className="text-xs text-gray-500">ID: {formData.DocumentIds[index]}</p>
                            {documentUrls[index] && (
                              <a
                                href={documentUrls[index]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-0.5"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Document IDs Summary */}
                  {formData.DocumentIds.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Uploaded Document IDs ({formData.DocumentIds.length}):
                      </p>
                      <p className="text-xs text-blue-700 font-mono">
                        [{formData.DocumentIds.join(', ')}]
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-300">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 text-gray-600 hover:text-black transition-colors border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploadingFiles}
                  className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center border border-black"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Product...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Product to User Cart
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AddCustomProduct;
