import requests
import json

def check_input_types():
    """Check the review service GraphQL input types"""
    print("Checking review service input types...")
    
    # Query the schema for input types
    query = """
    {
      __schema {
        types {
          name
          kind
          inputFields {
            name
            type {
              kind
              name
              ofType {
                kind
                name
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
        
        # Find and print the input types
        if data.get("data") and data["data"].get("__schema") and data["data"]["__schema"].get("types"):
            types = data["data"]["__schema"]["types"]
            input_types = ["AddReviewInput", "UpdateReviewInput", "AddReviewAspectInput"]
            
            for input_type in input_types:
                for type_info in types:
                    if type_info.get("name") == input_type and type_info.get("inputFields"):
                        print(f"\n{input_type} fields:")
                        for field in type_info["inputFields"]:
                            field_type = field.get("type", {})
                            type_kind = field_type.get("kind")
                            type_name = field_type.get("name")
                            
                            # Handle non-null types
                            if type_kind == "NON_NULL" and field_type.get("ofType"):
                                of_type = field_type["ofType"]
                                type_name = of_type.get("name")
                                print(f"- {field['name']}: {type_name}! (required)")
                            else:
                                print(f"- {field['name']}: {type_name} (optional)")
                        break
        
    except Exception as e:
        print(f"Error checking review service input types: {str(e)}")

if __name__ == "__main__":
    check_input_types()
