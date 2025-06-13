import requests
import json

def check_mutation_response():
    """Check the review service GraphQL mutation response types"""
    print("Checking review service mutation response types...")
    
    # Query the schema for mutation fields and their return types
    query = """
    {
      __schema {
        mutationType {
          name
          fields {
            name
            type {
              name
              kind
              fields {
                name
                type {
                  name
                  kind
                }
              }
            }
          }
        }
      }
    }
    """
    
    try:
        response = requests.post(
            "http://localhost:3000/graphql",
            json={"query": query},
            headers={"Content-Type": "application/json"}
        )
        
        data = response.json()
        
        # Find and print the mutation response types
        if data.get("data") and data["data"].get("__schema") and data["data"]["__schema"].get("mutationType"):
            mutations = data["data"]["__schema"]["mutationType"]["fields"]
            for mutation in mutations:
                name = mutation.get("name")
                response_type = mutation.get("type", {})
                response_name = response_type.get("name")
                
                print(f"\n{name} returns {response_name}:")
                
                # Print fields of the response type
                if response_type.get("fields"):
                    for field in response_type["fields"]:
                        field_name = field.get("name")
                        field_type = field.get("type", {})
                        field_type_name = field_type.get("name")
                        print(f"- {field_name}: {field_type_name}")
        
    except Exception as e:
        print(f"Error checking mutation response types: {str(e)}")

if __name__ == "__main__":
    check_mutation_response()
